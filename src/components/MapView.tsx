import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, Circle, Tooltip, ZoomControl } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapBounds, MapStyle, NetworkResult, NearbyObject, ObjectType } from '../types';
import { hasCoordinates, networkSegments, objectLabels, objectName } from '../lib/map';
import { ObjectSymbol } from './ObjectSymbol';

const attribution = '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>';
const baseUrl = 'https://wmts.geo.admin.ch/1.0.0/';
const tiles = {
  light: `${baseUrl}ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg`,
  dark: `${baseUrl}ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg`,
  satellite: `${baseUrl}ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg`,
};
const icons = Object.fromEntries((['building', 'transformer', 'distribution_box', 'disconnect_point'] as ObjectType[]).map(type => [type, L.divIcon({
  className: 'tactical-marker', html: renderToStaticMarkup(<ObjectSymbol type={type} />), iconSize: [28, 28], iconAnchor: [14, 14],
})]));

const ObjectMarkers: React.FC<{ objects: NearbyObject[] }> = ({ objects }) => {
  // Co-located objects share a badge so a cabinet cannot cover its transformer.
  const groups = new Map<string, NearbyObject[]>();
  for (const object of objects) {
    const key = `${object.lat},${object.lon}`;
    groups.set(key, [...(groups.get(key) || []), object]);
  }
  return <>{[...groups.entries()].map(([key, group]) => {
    const icon = group.length === 1 ? icons[group[0].type] : L.divIcon({
      className: 'tactical-marker',
      html: renderToStaticMarkup(<div style={{ display: 'flex', gap: 2 }}>{group.map((object, index) => <React.Fragment key={index}><ObjectSymbol type={object.type} /></React.Fragment>)}</div>),
      iconSize: [group.length * 30 - 2, 28], iconAnchor: [(group.length * 30 - 2) / 2, 14],
    });
    return <Marker key={key} position={[group[0].lat, group[0].lon]} icon={icon}>
      <Tooltip>{group.map(objectName).join(' · ')}</Tooltip>
      <Popup>{group.map((object, index) => <div key={index} className={index ? 'mt-2' : ''}><div className="font-bold">{objectName(object)}</div><div className="text-xs text-slate-400">{objectLabels[object.type] || 'Objekt'}</div></div>)}</Popup>
    </Marker>;
  })}</>;
};

interface MapViewProps {
  selectedResult: NetworkResult | null;
  nearbyObjects: NearbyObject[];
  userLocation: [number, number] | null;
  objectLocation: [number, number] | null;
  showConnections: boolean;
  showBuildings: boolean;
  mapStyle: MapStyle;
  onBoundsChange: (bounds: MapBounds) => void;
}

function ViewController({ selectedResult, userLocation, objectLocation, onBoundsChange }: Pick<MapViewProps, 'selectedResult' | 'userLocation' | 'objectLocation' | 'onBoundsChange'>) {
  const map = useMapEvents({ moveend: publishBounds, resize: publishBounds });
  function publishBounds() {
    const b = map.getBounds();
    onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  }
  useEffect(() => { publishBounds(); }, [map, onBoundsChange]);
  useEffect(() => {
    if (!selectedResult) return;
    const points = [selectedResult.transformer, selectedResult.distribution_box, selectedResult.disconnect_point, selectedResult.building].filter(hasCoordinates).map(o => [o.lat, o.lon] as [number, number]);
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 18 });
  }, [selectedResult, map]);
  useEffect(() => { if (userLocation) map.setView(userLocation, 16); }, [userLocation, map]);
  useEffect(() => { if (objectLocation) map.setView(objectLocation, 18); }, [objectLocation, map]);
  return null;
}

const DirectedLine: React.FC<{ from: [number, number]; to: [number, number]; color: string }> = ({ from, to, color }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const arrows = useMemo(() => {
    const start = map.project(from, zoom), end = map.project(to, zoom);
    const distance = start.distanceTo(end);
    if (distance < 32) return [];
    const count = Math.min(30, Math.max(1, Math.floor(distance / 100)));
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    return Array.from({ length: count }, (_, i) => ({
      position: map.unproject(start.add(end.subtract(start).multiplyBy((i + 1) / (count + 1))), zoom),
      icon: L.divIcon({ className: 'flow-arrow', iconSize: [20, 20], iconAnchor: [10, 10], html: `<svg width="20" height="20" viewBox="0 0 20 20" style="transform:rotate(${angle}deg)"><path d="M5 3 L13 10 L5 17" fill="none" stroke="white" stroke-width="6" stroke-linejoin="round"/><path d="M5 3 L13 10 L5 17" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/></svg>` }),
    }));
  }, [from[0], from[1], to[0], to[1], zoom, map, color]);
  return <>
    <Polyline positions={[from, to]} pathOptions={{ color: 'white', weight: 7, opacity: 0.8 }} interactive={false} />
    <Polyline positions={[from, to]} pathOptions={{ color, weight: 4, opacity: 1 }}><Popup>Stromrichtung: Trafostation → Zwischenobjekte → Gebäude</Popup></Polyline>
    {arrows.map((arrow, i) => <Marker key={i} position={arrow.position} icon={arrow.icon} interactive={false} keyboard={false} zIndexOffset={-1000} />)}
  </>;
}

export const MapView: React.FC<MapViewProps> = ({ selectedResult, nearbyObjects, userLocation, objectLocation, showConnections, showBuildings, mapStyle, onBoundsChange }) => {
  const [tileError, setTileError] = useState(false);
  useEffect(() => setTileError(false), [mapStyle]);
  const nodes = selectedResult ? (['transformer', 'distribution_box', 'disconnect_point', 'building'] as ObjectType[]).flatMap(type => {
    const object = selectedResult[type];
    return hasCoordinates(object) ? [{ ...object, type, name: object.address }] : [];
  }) : [];
  return <div className="w-full h-full relative bg-slate-100">
    <MapContainer center={[47.17617354807756, 8.10599555386044]} zoom={14} className="w-full h-full" zoomControl={false} attributionControl={false} maxZoom={21}>
      <TileLayer key={mapStyle} attribution={attribution} url={tiles[mapStyle]} className={mapStyle === 'satellite' ? '' : `map-tiles-${mapStyle}`} maxNativeZoom={mapStyle === 'satellite' ? 20 : 18} maxZoom={21} eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }} />
      <ZoomControl position="bottomleft" />
      {userLocation && <><Circle center={userLocation} radius={500} pathOptions={{ color: '#ef4444', fillOpacity: 0.04, weight: 1 }} /><Circle center={userLocation} radius={8} pathOptions={{ color: 'white', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}><Popup>Dein Standort</Popup></Circle></>}
      <ObjectMarkers objects={nearbyObjects.filter(obj => (showBuildings || obj.type !== 'building') && Number.isFinite(obj.lat) && Number.isFinite(obj.lon))} />
      <ObjectMarkers objects={nodes} />
      {selectedResult && showConnections && networkSegments(selectedResult).map(([from, to], i) => <DirectedLine key={i} from={[from.lat, from.lon]} to={[to.lat, to.lon]} color={mapStyle === 'light' ? '#334155' : '#38bdf8'} />)}
      <ViewController selectedResult={selectedResult} userLocation={userLocation} objectLocation={objectLocation} onBoundsChange={onBoundsChange} />
    </MapContainer>
    {tileError && <div role="status" className="absolute bottom-10 left-14 right-20 z-[500] rounded-lg bg-slate-900 p-2 text-xs text-white">Kartenmaterial nicht verfügbar. Internetverbindung prüfen oder Kartenmodus wechseln. swisstopo deckt die Schweiz ab.</div>}
  </div>;
};
