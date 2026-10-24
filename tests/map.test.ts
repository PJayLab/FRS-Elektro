import test from 'node:test';
import assert from 'node:assert/strict';
import { areaQuery, hasCoordinates, inBounds, networkSegments, objectName, resultType } from '../src/lib/map.ts';
import type { NetworkObject, NetworkResult } from '../src/types.ts';
const node = (uuid: string, lat: number | null, lon: number | null): NetworkObject => ({ uuid, address: uuid, type: uuid, lat, lon, location: null });
const network: NetworkResult = { connection: null, transformer: node('trafo', 47, 8), distribution_box: node('vk', 47.01, 8.01), disconnect_point: node('trennstelle', 47.02, 8.02), building: node('haus', 47.03, 8.03) };

test('arrows follow transformer → distribution box → disconnect point → building', () => {
  assert.deepEqual(networkSegments(network).map(([a, b]) => [a.uuid, b.uuid]), [['trafo', 'vk'], ['vk', 'trennstelle'], ['trennstelle', 'haus']]);
});
test('direct connection and absent intermediate nodes are supported', () => {
  assert.deepEqual(networkSegments({ ...network, distribution_box: null, disconnect_point: null }).map(([a,b]) => [a.uuid,b.uuid]), [['trafo','haus']]);
});
test('missing coordinates do not invent a connection bypassing an existing object', () => {
  assert.equal(networkSegments({ ...network, distribution_box: node('vk', null, null) }).length, 1);
  assert.equal(hasCoordinates(node('zero', 0, 0)), true);
  assert.equal(hasCoordinates(node('invalid', NaN, 8)), false);
});
test('co-located transformer and cabinet have no zero-length arrow', () => {
  assert.equal(networkSegments({ ...network, distribution_box: node('vk', 47, 8) }).length, 2);
});
test('viewport query covers its corners and filters outside the rectangle', () => {
  const bounds = { north: 47.19, south: 47.17, west: 8.09, east: 8.13 };
  const q = areaQuery(bounds);
  assert.ok(Math.abs(q.lat - 47.18) < 1e-10);
  assert.ok(Math.abs(q.lon - 8.11) < 1e-10);
  assert.ok(q.radius > 1800 && q.radius < 2000);
  assert.equal(inBounds({ name: 'inside', type: 'transformer', lat: 47.19, lon: 8.13 }, bounds), true);
  assert.equal(inBounds({ name: 'outside', type: 'building', lat: 47.2, lon: 8.11 }, bounds), false);
});
test('legacy connection results and future individual object results are distinguished', () => {
  assert.equal(resultType({ connection_uuid: 'a', address: 'Test', location: null }), 'connection');
  assert.equal(resultType({ type: 'transformer', uuid: 'b', address: 'Test', location: null }), 'transformer');
});
test('display name/address takes priority over backend name and labels are German', () => {
  const object = { type: 'building' as const, name: 'building', lat: 47, lon: 8, address: 'Dorfstrasse 1' };
  assert.equal(objectName(object), 'Dorfstrasse 1');
  assert.equal(objectName({ ...object, display_name: 'Dorfstrasse 1, Sursee' }), 'Dorfstrasse 1, Sursee');
  assert.equal(objectName({ ...object, address: '' }), 'Gebäude');
});
