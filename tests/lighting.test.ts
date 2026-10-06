import { expect, test } from 'vitest';
import { DEFAULT_LIGHTING, lightingFromQuery, parseLighting, writeLightingQuery } from '../src/lighting/settings';
import { generateNormals, silhouetteDistance } from '../src/lighting/normals';
import { headRotation, shadeAmount, shadowOffset } from '../src/lighting/shading';
import { lightingMessage, lightingValue, lightingWire } from '../src/lighting/protocol';
import { viewSettings, streamUrl } from '../src/live/settings';

test('inflated disc normals face outward at the rim and forward at the centre', () => {
  const size = 65, alpha = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (Math.hypot(x - 32, y - 32) <= 28) alpha[y * size + x] = 255;
  const data = generateNormals(alpha, size, size, [0, 0, size, size]);
  const normal = (x: number, y: number) => [...data.slice((y * size + x) * 4, (y * size + x) * 4 + 3)].map(v => v / 255 * 2 - 1);
  expect(normal(32, 32)[0]).toBeCloseTo(0, 2); expect(normal(32, 32)[1]).toBeCloseTo(0, 2); expect(normal(32, 32)[2]).toBe(1);
  expect(normal(58, 32)[0]).toBeGreaterThan(0.2); expect(normal(6, 32)[0]).toBeLessThan(-0.2);
  expect(normal(32, 58)[1]).toBeGreaterThan(0.2); expect(normal(32, 6)[1]).toBeLessThan(-0.2);
  expect(silhouetteDistance(alpha, size, size)[0]).toBe(0);
});
test('transparent and fully opaque rectangles produce finite normals', () => {
  for (const alpha of [new Uint8Array(1), new Uint8Array(100).fill(255)]) {
    const n = generateNormals(alpha, Math.sqrt(alpha.length), Math.sqrt(alpha.length), [0, 0, 100, 100]);
    expect([...n].every(Number.isFinite)).toBe(true);
    for (let i = 3; i < n.length; i += 4) expect(n[i]).toBe(255);
  }
});
test('wrapped diffuse is brighter facing the source and cel has three bands', () => {
  for (const mode of ['soft', 'cel'] as const) expect(shadeAmount(1, mode, 0.6, 1)).toBeGreaterThan(shadeAmount(-1, mode, 0.6, 1));
  const levels = new Set(Array.from({length:201}, (_,i)=>shadeAmount(i / 100 - 1, 'cel', 0.6, 1)));
  expect(levels.size).toBe(3);
  expect(shadeAmount(1, 'soft', 1, 0)).toBe(0);
  expect(shadowOffset(0, 0)).toEqual([0.06, 0.06]); expect(shadowOffset(1, 1)).toEqual([-0.06, -0.06]);
});
test('head yaw rotates the front normal toward the new direction; roll uses the rig angle', () => {
  const r = headRotation(30, 0, 0, 0.3);
  expect(r[6]).toBeCloseTo(0.5); expect(r[7]).toBeCloseTo(0); expect(r[8]).toBeCloseTo(Math.sqrt(3)/2);
  const roll = headRotation(0, 0, 30, 0.3);
  expect(roll[0]).toBeCloseTo(Math.cos(-0.3)); expect(roll[1]).toBeCloseTo(Math.sin(-0.3));
});
test('lighting URLs round trip every option and clamp malformed numbers', () => {
  const light = { ...DEFAULT_LIGHTING, enabled: true, x: 0.9, y: 0.8, z: 1.2, color: 0x1234ff, strength: 0.8, intensity: 1.5, ambient: 0.2, mode: 'cel' as const, shadow: true };
  const query = new URLSearchParams(); writeLightingQuery(query, light); expect(lightingFromQuery(query)).toEqual(light);
  const view = { ...viewSettings(''), lighting: light };
  expect(viewSettings(new URL(streamUrl(view, 'http://127.0.0.1:5173')).search)).toEqual(view);
  expect(lightingFromQuery(new URLSearchParams('light=true&lx=999&ly=NaN&lz=&lc=javascript&ls=-2&lm=unknown'))).toEqual({ ...DEFAULT_LIGHTING, x: 1, strength: 0 });
});
test('relay accepts only complete, numeric or enumerated lighting settings', () => {
  const message = lightingWire('project-a', { ...DEFAULT_LIGHTING, enabled: true });
  expect(lightingMessage(message)).toEqual(message);
  expect(lightingValue(message)).toEqual({ ...DEFAULT_LIGHTING, enabled: true });
  for (const change of [{ z: Infinity }, { x: '0.5' }, { color: '#ffffff' }, { color: 1.2 }, { mode: 'other' }, { enabled: true }, { enabled: '1' }, { shadow: 2 }, { url: 'https://example.com' }]) {
    expect(lightingMessage({ ...message, lighting: { ...message.lighting, ...change } })).toBeNull();
  }
  for (const invalid of [null, [], { ...message, project: '../private' }, { ...message, params: {} }, { project: 'a', lighting: {} }]) expect(lightingMessage(invalid)).toBeNull();
  expect(parseLighting({ ...DEFAULT_LIGHTING, x: NaN })).toBeNull();
});

test('cropped opaque borders do not bend toward an artificial outside silhouette', () => {
  const size = 25, alpha = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 5; x < 20; x++) alpha[y * size + x] = 255;
  const distance = silhouetteDistance(alpha, size, size, true);
  expect(distance[12]).toBe(distance[12 * size + 12]);
  expect(distance[24 * size + 12]).toBe(distance[12 * size + 12]);
});
