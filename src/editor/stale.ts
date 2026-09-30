import type { Rig } from '../rig/types';

export function layerSignature(rig: Rig) {
  return JSON.stringify({
    image: rig.image,
    eyes: rig.eyes,
    hand: rig.hand ? {
      outline: rig.hand.outline, jaw: rig.hand.jaw,
      jawRange: rig.hand.jawRange, background: rig.hand.background,
    } : null,
    accessories: (rig.accessories ?? []).map(part => ({ name: part.name, box: part.box, color: part.color })),
  });
}
