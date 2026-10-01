import { useEffect, useRef, useState } from 'react';
import { createMeshAvatar, type MeshAvatar } from '../engine';
import { PARAMS } from '../engine/rig.js';
import type { Rig } from '../rig/types';
import { useI18n } from './i18n';
import { Icon } from './Icon';

const defaults: Record<string, number> = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
const sliders = [
  { id: 'angleX', label: 'turn', min: -30, max: 30, def: 0 },
  { id: 'angleY', label: 'look', min: -30, max: 30, def: 0 },
  { id: 'angleZ', label: 'tilt', min: -30, max: 30, def: 0 },
  { id: 'EyeOpen', label: 'eyeOpen', min: 0, max: 1.25, def: 1 },
  { id: 'mouthOpen', label: 'mouthOpen', min: 0, max: 1, def: 0 },
  { id: 'bodyAngleZ', label: 'bodyTilt', min: -10, max: 10, def: 0 },
] as const;
export function Preview({ rig, assets }: { rig: Rig; assets?: Record<string, string> }) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const avatar = useRef<MeshAvatar | null>(null);
  const [status, setStatus] = useState<'loading' | 'updating' | 'ready' | 'previewError'>('loading');
  const [revision, setRevision] = useState(0);
  const [idle, setIdle] = useState(true);
  const [stress, setStress] = useState(false);
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const controls = useRef({ idle, stress, parameters });
  controls.current = { idle, stress, parameters };
  useEffect(() => {
    let cancelled = false;
    let instance: MeshAvatar | undefined;
    setStatus('updating');
    const timer = setTimeout(() => {
      createMeshAvatar(canvas.current!, { rig, assets, assetsBase: '/miko-qipao/built/', manual: true }).then(value => {
        if (cancelled) { value.destroy(); return; }
        instance = value;
        avatar.current = value;
        const control = controls.current;
        value.setAutoIdle(control.idle && !control.stress);
        value.setAutoMotion(control.idle && !control.stress);
        value.setParameters(control.idle && !control.stress ? control.parameters : { ...defaults, ...control.parameters });
        // A paused preview uses a fixed warm-up so edited rigs are compared at the same physics time.
        value.advance(control.idle && !control.stress ? 1 / 60 : 1);
        setRevision(current => current + 1);
        setStatus('ready');
      }).catch(() => { if (!cancelled) setStatus('previewError'); });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      instance?.destroy();
      if (avatar.current === instance) avatar.current = null;
    };
  }, [rig, idle, stress, assets]);
  useEffect(() => {
    const value = avatar.current;
    if (!value) return;
    value.setAutoIdle(idle && !stress);
    value.setAutoMotion(idle && !stress);
    value.setParameters(idle && !stress ? parameters : { ...defaults, ...parameters });
    value.advance(0);
    if (!idle && !stress) return;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      if (stress) {
        const t = (now - start) / 1000;
        value.setParameters({ ...defaults, ...parameters,
          angleX: Math.sin(t * 2) * 30, angleY: Math.cos(t * 1.3) * 25,
          angleZ: Math.sin(t * 1.1) * 25, bodyAngleZ: Math.cos(t * 0.7) * 8 });
        if (t >= 6) { setStress(false); return; }
      }
      value.advance(1 / 60);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rig, assets, idle, stress, parameters, revision]);
  return (
    <section className="panel preview-panel">
      <div className="panel-title"><h2>{t.preview}</h2><span role="status" data-testid="preview-status" data-state={status}>{t[status]}</span></div>
      <canvas ref={canvas} data-testid="preview" data-revision={revision} className="preview-canvas"
        style={{ aspectRatio: `${rig.image.width * (1 + 2 * rig.view.padSide)} / ${rig.image.height * (1 + rig.view.padTop)}` }} />
      <div className="preview-tools">
        <button className="icon-button" aria-label={idle ? t.pause : t.play} title={idle ? t.pause : t.play}
          data-testid="idle-toggle" aria-pressed={idle} onClick={() => setIdle(current => !current)}><Icon name={idle ? 'pause' : 'play'} /></button><span>{t.idle}</span>
      </div>
      <details className="pose-test" open><summary>{t.pose}</summary>
        <button className="reset-pose" onClick={() => { setParameters({}); setStress(false); }}>{t.reset}</button>
      <div className="sliders">
        {sliders.map(slider => (
          <label key={slider.id}>{t[slider.label]}
            <input type="range" aria-label={t[slider.label]} min={slider.min} max={slider.max} step="0.05"
              value={parameters[slider.id === 'EyeOpen' ? 'eyeLOpen' : slider.id] ?? slider.def}
              onChange={event => {
                const value = Number(event.target.value);
                setParameters(current => slider.id === 'EyeOpen'
                  ? { ...current, eyeLOpen: value, eyeROpen: value }
                  : { ...current, [slider.id]: value });
              }} />
            <output>{(parameters[slider.id === 'EyeOpen' ? 'eyeLOpen' : slider.id] ?? slider.def).toFixed(2)}</output>
          </label>
        ))}
      </div>
      <button className="sweep-button" title={t.sweepTip} onClick={() => setStress(current => !current)}>{stress ? t.stopSweep : t.sweep}</button>
      </details>
    </section>
  );
}
