import proj4 from 'proj4';
import type { MapBounds } from '../types';

const lv95 = '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346 +units=m +no_defs';
export const GIS_LIMIT = 1000;
export function gisBounds(b: MapBounds) {
  const points = [b.west, b.east].flatMap(lon => [b.south, b.north].map(lat => proj4('EPSG:4326', lv95, [lon, lat])));
  return [Math.min(...points.map(p => p[0])) - 2, Math.min(...points.map(p => p[1])) - 2,
    Math.max(...points.map(p => p[0])) + 2, Math.max(...points.map(p => p[1])) + 2];
}
export interface Trench { id: string; positions: [number, number][][] }
export function parseTrenches(data: any): Trench[] {
  if (data?.type !== 'FeatureCollection' || data.srs !== 'EPSG:2056' || !Array.isArray(data.features)) throw new Error('Ungültige GIS-Daten oder unbekanntes Koordinatensystem.');
  return data.features.map((feature: any, index: number) => {
    const geometry = feature.geometry;
    const lines = geometry?.type === 'LineString' ? [geometry.coordinates] : geometry?.type === 'MultiLineString' ? geometry.coordinates : null;
    if (!Array.isArray(lines)) throw new Error('Nicht unterstützte GIS-Geometrie.');
    const positions = lines.map((line: any) => {
      if (!Array.isArray(line) || line.length < 2) throw new Error('Ungültige Trassenlinie.');
      return line.map((point: any) => {
        if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) throw new Error('Ungültige GIS-Koordinaten.');
        const [lon, lat] = proj4(lv95, 'EPSG:4326', point.slice(0, 2));
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Ungültige GIS-Koordinaten.');
        return [lat, lon] as [number, number];
      });
    });
    return { id: String(feature.id ?? feature.properties?.obj_id ?? index), positions };
  });
}
