import { createFaceTracker } from './face-tracker';
import { rmsLevel, type FaceResult } from './tracking';

export type CameraState = 'stopped' | 'starting' | 'running' | 'cameraBlocked' | 'cameraUnavailable' | 'modelError';
export class CameraCapture {
  private generation = 0;
  private stream?: MediaStream;
  private tracker?: Awaited<ReturnType<typeof createFaceTracker>>;
  private raf = 0;
  readonly timing = { frames: 0, totalMs: 0, maxMs: 0, delegate: '' };
  constructor(private video: HTMLVideoElement, private onResult: (result: FaceResult, now: number) => void, private onState: (state: CameraState) => void) {}
  stop() {
    this.generation++; cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.tracker?.close(); this.tracker = undefined;
    this.video.srcObject = null;
    this.onState('stopped');
  }
  async start(deviceId: string) {
    this.stop(); const generation = this.generation;
    this.onState('starting');
    let loadingModel = false;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream; this.video.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (this.stream === stream) { this.stop(); this.onState('cameraUnavailable'); } }, { once: true });
      await this.video.play();
      if (generation !== this.generation) return;
      loadingModel = true;
      const tracker = await createFaceTracker();
      if (generation !== this.generation) { tracker.close(); return; }
      this.tracker = tracker; this.timing.delegate = tracker.delegate;
      this.onState('running');
      let lastFrame = -Infinity, lastVideo = -1;
      const frame = (now: number) => {
        if (generation !== this.generation) return;
        if (now - lastFrame >= 1000 / 30 && this.video.readyState >= 2 && this.video.currentTime !== lastVideo) {
          lastFrame = now; lastVideo = this.video.currentTime;
          try {
            const start = performance.now(), result = tracker.detect(this.video, now), elapsed = performance.now() - start;
            this.timing.frames++; this.timing.totalMs += elapsed; this.timing.maxMs = Math.max(this.timing.maxMs, elapsed);
            this.onResult(result, now);
          } catch { this.stop(); this.onState('modelError'); return; }
        }
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.onState(loadingModel ? 'modelError' : error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name) ? 'cameraBlocked' : 'cameraUnavailable');
    }
  }
}

export type MicState = 'micOff' | 'micStarting' | 'micOn' | 'micBlocked' | 'micUnavailable';
export class MicrophoneCapture {
  private generation = 0;
  private stream?: MediaStream;
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private samples = new Float32Array(1024);
  constructor(private onState: (state: MicState) => void) {}
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    void this.context?.close().catch(() => undefined); this.context = undefined; this.analyser = undefined;
    this.onState('micOff');
  }
  async start(deviceId: string) {
    this.stop(); const generation = this.generation; this.onState('micStarting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { echoCancellation: true, noiseSuppression: true, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getAudioTracks()[0]?.addEventListener('ended', () => { if (this.stream === stream) { this.stop(); this.onState('micUnavailable'); } }, { once: true });
      const context = new AudioContext(); this.context = context;
      await context.resume();
      if (generation !== this.generation) return;
      this.analyser = context.createAnalyser(); this.analyser.fftSize = this.samples.length;
      context.createMediaStreamSource(stream).connect(this.analyser);
      // Never connect to the audio output or record the captured samples.
      this.onState('micOn');
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop(); this.onState(error instanceof DOMException && error.name === 'NotAllowedError' ? 'micBlocked' : 'micUnavailable');
    }
  }
  level(gain: number) {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    return rmsLevel(this.samples, gain);
  }
}
