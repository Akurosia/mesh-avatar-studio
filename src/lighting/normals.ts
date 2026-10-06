import type { Ellipse, Rig } from '../rig/types';

// Two-pass chamfer distance. Full-image borders may cut through the artwork;
// do not curl those crop edges as if they were part of the visible silhouette.
export function silhouetteDistance(alpha: Uint8Array, width: number, height: number, cropped = false) {
  const boundary = cropped ? Math.max(width, height) * 2 : 1;
  const d = new Float32Array(alpha.length), diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (alpha[i] <= 3) continue;
    d[i] = Math.min(x ? d[i - 1] + 1 : boundary, y ? d[i - width] + 1 : boundary,
      x && y ? d[i - width - 1] + diagonal : boundary, y && x + 1 < width ? d[i - width + 1] + diagonal : boundary);
    // The upper-right pixel is already on the previous row; all distances there are final for this pass.
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (!alpha[i] || alpha[i] <= 3) continue;
    d[i] = Math.min(d[i], x + 1 < width ? d[i + 1] + 1 : boundary, y + 1 < height ? d[i + width] + 1 : boundary,
      x && y + 1 < height ? d[i + width - 1] + diagonal : boundary,
      x + 1 < width && y + 1 < height ? d[i + width + 1] + diagonal : boundary);
  }
  return d;
}
function gaussian(x: number, y: number, e: Ellipse) { return Math.exp(-(((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2)); }
export function rigHeight(x: number, y: number, rig: Rig) {
  // Smooth domes have no crease at the ellipse border. Facial overlays share this field.
  let h = rig.head.rx * 0.55 * gaussian(x, y, rig.head) + rig.body.chest.rx * 0.23 * gaussian(x, y, rig.body.chest);
  h += rig.face.nose.rx * 0.2 * gaussian(x, y, rig.face.nose);
  for (const [cx, cy] of rig.cheeks) h += rig.head.rx * 0.012 * gaussian(x, y, { cx, cy, rx: rig.head.rx * 0.3, ry: rig.head.ry * 0.16 });
  return h;
}
export function generateNormals(alpha: Uint8Array, width: number, height: number, rect: readonly number[], rig?: Rig, inflate = true) {
  const cropped = !!rig && rect[0] === 0 && rect[1] === 0 && rect[2] === rig.image.width && rect[3] === rig.image.height;
  const distances = silhouetteDistance(alpha, width, height, cropped), heights = new Float32Array(alpha.length);
  const dx = rect[2] / width, dy = rect[3] / height, unit = Math.min(dx, dy);
  const depth = Math.min(rect[2], rect[3]) * 0.08;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    heights[i] = (inflate ? Math.sqrt(distances[i] * unit * depth) * 0.55 : 0)
      + (rig ? rigHeight(rect[0] + (x + 0.5) * dx, rect[1] + (y + 0.5) * dy, rig) : 0);
  }
  const normals = new Uint8Array(width * height * 4);
  const sample = (x: number, y: number) => heights[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    // A small derivative footprint suppresses staircase artifacts in the distance field.
    const nx = -(sample(x + 2, y) - sample(x - 2, y)) / (4 * dx), ny = -(sample(x, y + 2) - sample(x, y - 2)) / (4 * dy);
    const len = Math.hypot(nx, ny, 1), i = (y * width + x) * 4;
    normals[i] = Math.round((nx / len * 0.5 + 0.5) * 255);
    normals[i + 1] = Math.round((ny / len * 0.5 + 0.5) * 255);
    normals[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255); normals[i + 3] = 255;
  }
  return normals;
}
// CPU data survives preview renderer rebuilds; weak image keys release closed projects.
const cache = new WeakMap<HTMLImageElement, { key: string; data: Uint8Array; width: number; height: number }>();
export function layerNormals(image: HTMLImageElement, rect: number[], rig: Rig, inflate: boolean) {
  const key = JSON.stringify([rect, rig.head, rig.body.chest, rig.face.nose, rig.cheeks, inflate]);
  const cached = cache.get(image);
  if (cached?.key === key) return { ...cached, computed: false, ms: 0 };
  const start = performance.now(), scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data, alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[4 * i + 3];
  const result = { key, data: generateNormals(alpha, width, height, rect, rig, inflate), width, height };
  cache.set(image, result);
  return { ...result, computed: true, ms: performance.now() - start };
}
