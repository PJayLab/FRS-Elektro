import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gisBounds, parseTrenches } from '../src/lib/gis';

const feature = (geometry: unknown) => ({ type: 'FeatureCollection', srs: 'EPSG:2056', features: [{ id: 42, geometry }] });
test('LV95 origin converts to Bern in Leaflet latitude/longitude order', () => {
  const result = parseTrenches(feature({ type: 'LineString', coordinates: [[2600000, 1200000], [2600010, 1200010]] }));
  const [lat, lon] = result[0].positions[0][0];
  assert.ok(Math.abs(lat - 46.95108) < 0.00002);
  assert.ok(Math.abs(lon - 7.43864) < 0.00002);
  assert.equal(result[0].id, '42');
  const bbox = gisBounds({ west: lon - 0.001, east: lon + 0.001, south: lat - 0.001, north: lat + 0.001 });
  assert.ok(bbox[0] < 2600000 && bbox[2] > 2600000 && bbox[1] < 1200000 && bbox[3] > 1200000);
});
test('preserves disconnected MultiLineString parts', () => {
  const lines = [[[2650671.634, 1227317.305], [2650673.973, 1227318.501]], [[2650702, 1227320], [2650703, 1227326]]];
  assert.equal(parseTrenches(feature({ type: 'MultiLineString', coordinates: lines }))[0].positions.length, 2);
});
test('rejects unknown CRS and invalid geometry instead of inventing routes', () => {
  assert.throws(() => parseTrenches({ ...feature(null), srs: 'EPSG:4326' }));
  assert.throws(() => parseTrenches(feature({ type: 'LineString', coordinates: [[null, 1], [2, 3]] })));
  assert.deepEqual(parseTrenches({ type: 'FeatureCollection', srs: 'EPSG:2056', features: [] }), []);
});
