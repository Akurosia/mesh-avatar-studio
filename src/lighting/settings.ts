export interface LightingSettings {
  enabled: boolean; x: number; y: number; z: number; color: number;
  strength: number; intensity: number; ambient: number; mode: 'soft' | 'cel'; shadow: boolean;
}
export const DEFAULT_LIGHTING: Readonly<LightingSettings> = Object.freeze({
  enabled: false, x: 0.2, y: 0.2, z: 0.65, color: 0xffffff,
  strength: 0.35, intensity: 1, ambient: 0.6, mode: 'soft', shadow: false,
});
const ranges = { x: [0, 1], y: [0, 1], z: [0.1, 2], color: [0, 0xffffff], strength: [0, 1], intensity: [0, 2], ambient: [0, 1] } as const;
// Strict wire format: only finite numbers and enumerated strings; no arbitrary payloads.
export function parseLighting(input: unknown): LightingSettings | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  if (Object.keys(data).length !== Object.keys(DEFAULT_LIGHTING).length || Object.keys(data).some(k => !(k in DEFAULT_LIGHTING))) return null;
  if (![true, false].includes(data.enabled as boolean) || ![true, false].includes(data.shadow as boolean) || !['soft', 'cel'].includes(data.mode as string)) return null;
  const result = { ...DEFAULT_LIGHTING, enabled: data.enabled, shadow: data.shadow, mode: data.mode } as LightingSettings;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const value = data[key], [min, max] = ranges[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || (key === 'color' && !Number.isInteger(value))) return null;
    result[key] = Math.max(min, Math.min(max, value));
  }
  return result;
}
export function lightingFromQuery(query: URLSearchParams): LightingSettings {
  const value = { ...DEFAULT_LIGHTING, enabled: query.get('light') === '1', shadow: query.get('shadow') === '1', mode: query.get('lm') === 'cel' ? 'cel' : 'soft' } as LightingSettings;
  for (const [key, param] of Object.entries({ x: 'lx', y: 'ly', z: 'lz', strength: 'ls', intensity: 'li', ambient: 'la' })) {
    const raw = query.get(param), n = Number(raw);
    if (raw?.trim() && Number.isFinite(n)) (value as unknown as Record<string, unknown>)[key] = n;
  }
  const color = query.get('lc');
  if (color && /^[0-9a-f]{6}$/i.test(color)) value.color = parseInt(color, 16);
  return parseLighting(value)!;
}
export function writeLightingQuery(query: URLSearchParams, value: LightingSettings) {
  const pairs = { light: value.enabled ? '1' : '0', lx: value.x, ly: value.y, lz: value.z,
    lc: colorHex(value.color).slice(1), ls: value.strength, li: value.intensity, la: value.ambient,
    lm: value.mode, shadow: value.shadow ? '1' : '0' };
  for (const [key, v] of Object.entries(pairs)) query.set(key, String(v));
}
export function colorHex(color: number) { return `#${color.toString(16).padStart(6, '0')}`; }
export function loadLighting(project: string): LightingSettings {
  try { return parseLighting(JSON.parse(localStorage.getItem(`mesh-avatar:lighting:${project}`) ?? 'null')) ?? { ...DEFAULT_LIGHTING }; }
  catch { return { ...DEFAULT_LIGHTING }; }
}
export function saveLighting(project: string, value: LightingSettings) {
  try { localStorage.setItem(`mesh-avatar:lighting:${project}`, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
