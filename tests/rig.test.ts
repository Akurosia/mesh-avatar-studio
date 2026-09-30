import { expect, test } from 'vitest';
import fixture from '../samples/miko-qipao/rig.json';
import { parseRig, validateRig } from '../src/rig/validate';

test('accepts the reference fixture and optional groups', () => {
  expect(validateRig(fixture)).toEqual([]);
  const rig = parseRig(fixture);
  delete rig.hand;
  delete rig.buns;
  delete rig.strands;
  delete rig.accessories;
  expect(validateRig(rig)).toEqual([]);
});
test('names missing fields and malformed polygons', () => {
  const missing = { ...fixture, image: { width: 1254 } };
  expect(validateRig(missing).join()).toContain('rig.image.height');
  const malformed = structuredClone(fixture);
  malformed.eyes[0].opening = [[1, 2], [3, 4]];
  expect(validateRig(malformed).join()).toContain('rig.eyes[0].opening');
});
test('rejects nonfinite values, zero radii and degenerate strands', () => {
  const rig = parseRig(fixture);
  rig.head.rx = 0;
  rig.body.pivotX = NaN;
  expect(validateRig(rig).join()).toContain('rig.head.rx');
  expect(validateRig(rig).join()).toContain('rig.body.pivotX');
  rig.head.rx = 430;
  rig.body.pivotX = 640;
  rig.strands![0].nodes[1] = rig.strands![0].nodes[0];
  expect(validateRig(rig).join()).toContain('rig.strands[0].nodes');
});
