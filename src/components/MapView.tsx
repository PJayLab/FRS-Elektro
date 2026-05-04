import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { NetworkResult, NearbyObject } from '../types';

// Fix for default marker icons
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const MAP_STYLES: Record<string, string> = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  minimal: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
  osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createCustomIcon = (color: string, type: 'building' | 'transformer' | 'distribution_box' | 'disconnect_point') => {
  let svgContent = '';
  
  switch (type) {
    case 'building':
      svgContent = `<path d="M3 21h18M3 7l9-4 9 4v14H3V7z" fill="white" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
      break;
    case 'transformer':
      svgContent = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
      break;
    case 'distribution_box':
      svgContent = `<rect x="4" y="4" width="16" height="16" rx="2" fill="white" stroke="${color}" stroke-width="2" stroke-linejoin="round"/><path d="M8 8h8M8 12h8M8 16h4" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
      break;
    case 'disconnect_point':
      svgContent = `<circle cx="12" cy="12" r="8" fill="white" stroke="${color}" stroke-width="3"/><path d="M8 8l8 8M16 8l-8 8" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;
      break;
  }

  return new L.DivIcon({
    className: 'tactical-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 24px; 
        height: 24px; 
        border-radius: 8px; 
        border: 2px solid white; 
        box-shadow: 0 0 10px ${color}88, 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease-out;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${svgContent}
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const icons = {
  building: createCustomIcon('#ef4444', 'building'), // Red
  transformer: createCustomIcon('#3b82f6', 'transformer'), // Blue
  distribution_box: createCustomIcon('#eab308', 'distribution_box'), // Yellow
  disconnect_point: createCustomIcon('#1f2937', 'disconnect_point'), // Dark Gray
};

interface MapViewProps {
  selectedResult: NetworkResult | null;
  nearbyObjects: NearbyObject[];
  userLocation: [number, number] | null;
  showConnections: boolean;
  onMarkerClick: (name: string) => void;
}

function ChangeView({ center, zoom, bounds }: { center?: [number, number]; zoom?: number; bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, zoom || 15);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({ selectedResult, nearbyObjects, userLocation, showConnections, onMarkerClick }) => {
  const defaultCenter: [number, number] = [47.17617354807756, 8.10599555386044];
  
  const getBounds = () => {
    if (!selectedResult) return undefined;
    const points: [number, number][] = [];
    if (selectedResult.building.lat && selectedResult.building.lon) points.push([selectedResult.building.lat, selectedResult.building.lon]);
    if (selectedResult.transformer?.lat && selectedResult.transformer?.lon) points.push([selectedResult.transformer.lat, selectedResult.transformer.lon]);
    if (selectedResult.distribution_box?.lat && selectedResult.distribution_box?.lon) points.push([selectedResult.distribution_box.lat, selectedResult.distribution_box.lon]);
    if (selectedResult.disconnect_point?.lat && selectedResult.disconnect_point?.lon) points.push([selectedResult.disconnect_point.lat, selectedResult.disconnect_point.lon]);
    
    if (points.length < 2) return undefined;
    return L.latLngBounds(points);
  };

  const bounds = getBounds();

  return (
    <div className="w-full h-full relative bg-slate-100">
      <MapContainer center={defaultCenter} zoom={14} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={MAP_STYLES['voyager']}
        />
        
        {/* User Location */}
        {userLocation && (
          <>
            <Marker position={userLocation}>
              <Popup>Standort</Popup>
            </Marker>
            <Circle center={userLocation} radius={500} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }} />
          </>
        )}

        {/* Nearby Objects */}
        {nearbyObjects.map((obj, idx) => (
          <Marker 
            key={`nearby-${idx}`} 
            position={[obj.lat, obj.lon]} 
            icon={icons[obj.type] || DefaultIcon}
            eventHandlers={{ click: () => onMarkerClick(obj.name) }}
          >
            <Popup className="dark-popup">
              <div className="text-slate-100">
                <div className="font-bold">{obj.name}</div>
                <div className="text-[10px] uppercase opacity-50 tracking-widest">{obj.type.replace('_', ' ')}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Selected Network */}
        {selectedResult && (
          <>
            {/* Markers */}
            {selectedResult.building.lat && selectedResult.building.lon && (
              <Marker position={[selectedResult.building.lat, selectedResult.building.lon]} icon={icons.building}>
                <Popup>Gebäude: {selectedResult.building.address}</Popup>
              </Marker>
            )}
            {selectedResult.transformer?.lat && selectedResult.transformer?.lon && (
              <Marker position={[selectedResult.transformer.lat, selectedResult.transformer.lon]} icon={icons.transformer}>
                <Popup>Trafo: {selectedResult.transformer.address}</Popup>
              </Marker>
            )}
            {selectedResult.distribution_box?.lat && selectedResult.distribution_box?.lon && 
             !(selectedResult.transformer?.lat === selectedResult.distribution_box.lat && 
               selectedResult.transformer?.lon === selectedResult.distribution_box.lon) && (
              <Marker position={[selectedResult.distribution_box.lat, selectedResult.distribution_box.lon]} icon={icons.distribution_box}>
                <Popup>VK: {selectedResult.distribution_box.address}</Popup>
              </Marker>
            )}
            {selectedResult.disconnect_point?.lat && selectedResult.disconnect_point?.lon && (
              <Marker position={[selectedResult.disconnect_point.lat, selectedResult.disconnect_point.lon]} icon={icons.disconnect_point}>
                <Popup>Trennstelle: {selectedResult.disconnect_point.address}</Popup>
              </Marker>
            )}

            {/* Lines - ONLY if showConnections is true */}
            {showConnections && (
              <>
                {/* Transformer -> Distribution Box */}
                {selectedResult.transformer?.lat && selectedResult.transformer?.lon && 
                 selectedResult.distribution_box?.lat && selectedResult.distribution_box?.lon && (
                  <Polyline 
                    positions={[
                      [selectedResult.transformer.lat, selectedResult.transformer.lon],
                      [selectedResult.distribution_box.lat, selectedResult.distribution_box.lon]
                    ]}
                    pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }}
                  />
                )}

                {/* Path to Building */}
                {selectedResult.disconnect_point?.lat && selectedResult.disconnect_point?.lon ? (
                  <>
                    {/* Distribution Box -> Disconnect Point */}
                    {selectedResult.distribution_box?.lat && selectedResult.distribution_box?.lon && (
                      <Polyline 
                        positions={[
                          [selectedResult.distribution_box.lat, selectedResult.distribution_box.lon],
                          [selectedResult.disconnect_point.lat, selectedResult.disconnect_point.lon]
                        ]}
                        pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }}
                      />
                    )}
                    {/* Disconnect Point -> Building */}
                    {selectedResult.building.lat && selectedResult.building.lon && (
                      <Polyline 
                        positions={[
                          [selectedResult.disconnect_point.lat, selectedResult.disconnect_point.lon],
                          [selectedResult.building.lat, selectedResult.building.lon]
                        ]}
                        pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }}
                      />
                    )}
                  </>
                ) : (
                  /* Distribution Box -> Building fallback */
                  selectedResult.distribution_box?.lat && selectedResult.distribution_box?.lon && 
                  selectedResult.building.lat && selectedResult.building.lon && (
                    <Polyline 
                      positions={[
                        [selectedResult.distribution_box.lat, selectedResult.distribution_box.lon],
                        [selectedResult.building.lat, selectedResult.building.lon]
                      ]}
                      pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.8 }}
                    />
                  )
                )}
              </>
            )}
          </>
        )}

        <ChangeView bounds={bounds} center={userLocation || undefined} />
      </MapContainer>
    </div>
  );
};
