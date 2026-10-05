import { createMeshAvatar, type MeshAvatar } from '../engine';
import { PARAMS } from '../engine/rig.js';
import { localProjects, openLocalProject } from '../editor/project';
import fixture from 'virtual:sample-rig';
import { SAMPLE_PROJECT, type ViewSettings } from './settings';

export const neutralParameters: Record<string, number> = Object.fromEntries(PARAMS.map(param => [param.id, param.def]));
export interface FrameTiming { frames: number; totalMs: number; maxMs: number }
export async function createAvatarView(canvas: HTMLCanvasElement, settings: ViewSettings,
  beforeFrame?: (avatar: MeshAvatar, now: number, dt: number) => void) {
  canvas.dataset.state = 'loading';
  const projects = await localProjects(), project = projects?.find(entry => entry.name === settings.project);
  if (project?.error || (!project && settings.project !== SAMPLE_PROJECT)) throw new Error('Project unavailable');
  const loaded = project ? await openLocalProject(project) : { rig: fixture, assets: undefined };
  const avatar = await createMeshAvatar(canvas, { rig: loaded.rig!, assets: loaded.assets, manual: true, fit: settings.fit });
  avatar.setAutoIdle(settings.idle); avatar.setAutoMotion(settings.idle);
  if (!settings.idle) avatar.setParameters(neutralParameters);
  canvas.dataset.state = 'ready';
  const timing: FrameTiming = { frames: 0, totalMs: 0, maxMs: 0 };
  let raf = 0, previous = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (now - previous) / 1000)); previous = now;
    beforeFrame?.(avatar, now, dt);
    const start = performance.now();
    avatar.advance(dt, 1 / dt);
    const elapsed = performance.now() - start;
    timing.frames++; timing.totalMs += elapsed; timing.maxMs = Math.max(timing.maxMs, elapsed);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return { avatar, timing, destroy() { cancelAnimationFrame(raf); avatar.destroy(); } };
}
