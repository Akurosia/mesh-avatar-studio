import { existsSync, readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync(new URL('../samples/miko-qipao/built/layers.json', import.meta.url), 'utf8')) as { layers: Record<string, unknown> };
const sprites = JSON.parse(readFileSync(new URL('../samples/miko-qipao/built/sprites/sprites.json', import.meta.url), 'utf8')) as { layers: Record<string, unknown> };
const paths = ['source.png', 'built/base.png', 'built/hairmask.png',
  ...Object.keys(metadata.layers).map(name => `built/${name}.png`),
  ...Object.keys(sprites.layers).map(name => `built/sprites/${name}.png`)];
export const samplePresent = paths.every(path => existsSync(new URL(`../samples/miko-qipao/${path}`, import.meta.url)));
export const sampleSkipReason = 'Matching sample images are not installed; image-dependent checks are skipped.';
if (!samplePresent) console.info(sampleSkipReason);
