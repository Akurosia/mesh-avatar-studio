import { expect, test } from 'vitest';
import fixture from '../samples/miko-qipao/rig.json';
import { parseRig } from '../src/rig/validate';
import { layerSignature } from '../src/editor/stale';

test('cut-out changes mark layers stale without altering precut eye curves', () => {
  const rig = parseRig(fixture);
  const original = layerSignature(rig);
  rig.head.cx += 20;
  rig.hand!.wrist[0] += 10;
  expect(layerSignature(rig)).toBe(original);
  rig.eyes[0].opening[0][0] += 5;
  expect(layerSignature(rig)).not.toBe(original);
  expect(rig.eyes[0].top).toEqual(fixture.eyes[0].top);
  expect(rig.eyes[0].bot).toEqual(fixture.eyes[0].bot);
});
