import { parseRig } from '../rig/validate';
import type { Rig } from '../rig/types';

export interface ProjectAssets {
  sourceUrl: string;
  assets: Record<string, string>;
  rig?: Rig;
  urls: string[];
}
export async function openImageFolder(files: File[]): Promise<ProjectAssets> {
  const entries = files.map(file => ({ file, path: file.webkitRelativePath.replace(/^[^/]+\//, '') || file.name }));
  const source = entries.find(entry => /(^|\/)source\.png$/i.test(entry.path));
  const layers = entries.find(entry => /(^|\/)layers\.json$/i.test(entry.path));
  if (!source || !layers) throw new Error('Choose a project folder containing source.png, layers.json and the cut-out images.');
  const prefix = layers.path.slice(0, -'layers.json'.length);
  const rigFile = entries.find(entry => /(^|\/)rig\.json$/i.test(entry.path));
  const rig = rigFile ? parseRig(JSON.parse(await rigFile.file.text())) : undefined;
  const metadata = JSON.parse(await layers.file.text()) as { layers?: Record<string, unknown> };
  if (!metadata.layers || typeof metadata.layers !== 'object') throw new Error('layers.json must contain layer rectangles.');
  const available = new Set(entries.filter(entry => entry.path.startsWith(prefix)).map(entry => entry.path.slice(prefix.length)));
  const required = ['base.png', 'hairmask.png', ...Object.keys(metadata.layers).map(name => `${name}.png`)];
  const missing = required.filter(name => !available.has(name));
  if (missing.length) throw new Error(`Missing image files: ${missing.join(', ')}`);
  const urls: string[] = [];
  const sourceUrl = URL.createObjectURL(source.file);
  urls.push(sourceUrl);
  const assets = Object.fromEntries(entries.filter(entry => entry.path.startsWith(prefix)).map(entry => {
    const url = URL.createObjectURL(entry.file);
    urls.push(url);
    return [entry.path.slice(prefix.length), url];
  }));
  return { sourceUrl, assets, rig, urls };
}

export function sampleImagesAvailable(): Promise<boolean> {
  return Promise.all(['/miko-qipao/source.png', '/miko-qipao/built/base.png'].map(url => new Promise<boolean>(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  }))).then(results => results.every(Boolean));
}
