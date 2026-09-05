import type { MapBounds, NearbyObject, NetworkObject, NetworkResult, ObjectType, SearchResult } from '../types';

export const objectLabels: Record<ObjectType | 'connection', string> = {
  connection: 'Verbindung', building: 'Gebäude', transformer: 'Trafostation',
  distribution_box: 'Verteilkabine', disconnect_point: 'Trennstelle',
};
export const objectColors: Record<ObjectType, string> = {
  building: '#ef4444', transformer: '#3b82f6', distribution_box: '#eab308', disconnect_point: '#475569',
};
export const objectName = (object: NearbyObject) => {
  const name = object.name?.trim();
  return object.display_name?.trim() || object.address?.trim() ||
    (name && Object.hasOwn(objectLabels, name) ? objectLabels[name] : name) || objectLabels[object.type];
};
export const resultType = (result: SearchResult) => result.type || 'connection';
export const hasCoordinates = (object: NetworkObject | null | undefined): object is NetworkObject & { lat: number; lon: number } =>
  !!object && typeof object.lat === 'number' && typeof object.lon === 'number' && Number.isFinite(object.lat) && Number.isFinite(object.lon);

/** Preserve topology: an existing node without coordinates must not be silently bypassed. */
export function networkSegments(network: NetworkResult): [NetworkObject & { lat: number; lon: number }, NetworkObject & { lat: number; lon: number }][] {
  const nodes = [network.transformer, network.distribution_box, network.disconnect_point, network.building].filter(Boolean);
  return nodes.slice(1).flatMap((to, index) => {
    const from = nodes[index];
    return hasCoordinates(from) && hasCoordinates(to) && (from.lat !== to.lat || from.lon !== to.lon) ? [[from, to]] : [];
  });
}

export const inBounds = (object: NearbyObject, bounds: MapBounds) =>
  Number.isFinite(object.lat) && Number.isFinite(object.lon) && object.lat >= bounds.south && object.lat <= bounds.north && object.lon >= bounds.west && object.lon <= bounds.east;

export function areaQuery(bounds: MapBounds) {
  const lat = (bounds.north + bounds.south) / 2;
  const lon = (bounds.east + bounds.west) / 2;
  const radians = (angle: number) => angle * Math.PI / 180;
  const distances = [bounds.north, bounds.south].map(edge => {
    const a = Math.sin(radians(edge - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(edge)) * Math.sin(radians(bounds.east - lon) / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  });
  return { lat, lon, radius: Math.max(1, Math.ceil(Math.max(...distances))) };
}
