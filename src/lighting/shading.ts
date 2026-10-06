// Shared coefficients keep the reference math and shader in agreement.
export const WRAP = 0.45;
export const DARKEN = 0.55;
export const BRIGHTEN = 0.3;
export function shadeAmount(dot: number, mode: 'soft' | 'cel', ambient: number, intensity: number) {
  let diffuse = Math.max(0, Math.min(1, (dot + WRAP) / (1 + WRAP)));
  if (mode === 'cel') diffuse = diffuse < 0.4 ? 0.18 : diffuse < 0.75 ? 0.55 : 1;
  return Math.max(-1, Math.min(1, ambient + intensity * diffuse - 1));
}
export function shadowOffset(x: number, y: number): [number, number] { return [(0.5 - x) * 0.12, (0.5 - y) * 0.12]; }
export function headRotation(angleX: number, angleY: number, angleZ: number, maxRoll: number) {
  const yaw = angleX * Math.PI / 180, pitch = angleY * Math.PI / 180, roll = -angleZ / 30 * maxRoll;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // Column-major Rz * Ry * Rx, in image coordinates (y points down).
  return [cr * cy, sr * cy, -sy, cr * sy * sp - sr * cp, sr * sy * sp + cr * cp, cy * sp,
    cr * sy * cp + sr * sp, sr * sy * cp - cr * sp, cy * cp];
}
