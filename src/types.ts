export interface SearchResult {
  /** Missing type is the legacy connection response. */
  type?: 'connection' | ObjectType;
  connection_uuid?: string;
  uuid?: string;
  address: string;
  location: {
    lat: number;
    lon: number;
  } | string | null;
}

export interface NetworkObject {
  uuid: string;
  address: string;
  location: string | null;
  type: string;
  lat: number | null;
  lon: number | null;
}

export interface ConnectionInfo {
  uuid: string;
  disconnect_point_outgoing: string[];
  source_outgoing: string[];
  connection_notes: string[];
}

export interface NetworkResult {
  connection: ConnectionInfo | null;
  building: NetworkObject;
  transformer: NetworkObject | null;
  distribution_box: NetworkObject | null;
  disconnect_point: NetworkObject | null;
}

export type ObjectType = 'building' | 'transformer' | 'distribution_box' | 'disconnect_point';

export interface NearbyObject {
  uuid?: string;
  address?: string;
  display_name?: string;
  name: string;
  type: ObjectType;
  lat: number;
  lon: number;
}

export type MapStyle = 'light' | 'dark' | 'satellite';
export interface MapBounds { north: number; south: number; east: number; west: number }
