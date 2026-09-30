import { expect, test } from 'vitest';
import fixture from '../samples/miko-qipao/rig.json';
import { parseRig, validateRig } from '../src/rig/validate';
import { buildOverlay, changeVertex, moveHandle, nearestHandle, getAt } from '../src/editor/model';

const view = { scale: 0.5, x: 20, y: 10 };
test('hit-testing finds the nearest handle within eight screen pixels', () => {
  const handles = buildOverlay(parseRig(fixture)).handles.filter(h => h.id === 'head.center');
  expect(nearestHandle(handles, [615 * 0.5 + 27, 400 * 0.5 + 10], view)?.id).toBe('head.center');
  expect(nearestHandle(handles, [615 * 0.5 + 29, 400 * 0.5 + 10], view)).toBeUndefined();
  const competing = [...handles, { ...handles[0], id: 'nearer', point: [625, 400] as [number, number] }];
  expect(nearestHandle(competing, [625 * 0.5 + 20, 210], view)?.id).toBe('nearer');
});
test('dragging a center updates exactly its coordinates and radius handles preserve the center', () => {
  const rig = parseRig(fixture);
  const handles = buildOverlay(rig).handles;
  const next = moveHandle(rig, handles.find(h => h.id === 'head.center')!, [635, 420]);
  expect(next.head.cx).toBe(635);
  expect(next.head.cy).toBe(420);
  expect(rig.head.cx).toBe(615);
  const wider = moveHandle(rig, handles.find(h => h.id === 'head.rx')!, [1100, 400]);
  expect(wider.head.rx).toBe(485);
  expect(wider.head.cx).toBe(615);
});
test('vertex insertion and deletion preserve polygon and polyline minimum sizes', () => {
  let rig = parseRig(fixture);
  rig = changeVertex(rig, 'eyes.0.opening', 1, [448, 480], true);
  expect(getAt(rig, 'eyes.0.opening.1')).toEqual([448, 480]);
  while (rig.eyes[0].opening.length > 3) rig = changeVertex(rig, 'eyes.0.opening', 0, null, true);
  expect(changeVertex(rig, 'eyes.0.opening', 0, null, true).eyes[0].opening).toHaveLength(3);
  while (rig.strands![0].nodes.length > 2) rig = changeVertex(rig, 'strands.0.nodes', 0, null, false);
  expect(changeVertex(rig, 'strands.0.nodes', 0, null, false).strands![0].nodes).toHaveLength(2);
  expect(validateRig(rig)).toEqual([]);
});
