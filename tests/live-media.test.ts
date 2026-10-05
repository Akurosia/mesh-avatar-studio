import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CameraCapture, MicrophoneCapture } from '../src/live/media';

const createTracker = vi.hoisted(() => vi.fn());
vi.mock('../src/live/face-tracker', () => ({ createFaceTracker: createTracker }));
const empty = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
const media = () => {
  const track = { stop: vi.fn(), addEventListener: vi.fn() };
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream };
};
const video = () => ({ play: vi.fn(async () => undefined), srcObject: null, readyState: 2, currentTime: 0 }) as unknown as HTMLVideoElement;
beforeEach(() => { createTracker.mockReset(); vi.stubGlobal('cancelAnimationFrame', vi.fn()); vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); });
afterEach(() => vi.unstubAllGlobals());

test('stopping while camera permission is pending releases the eventual stream', async () => {
  const { stream, track } = media(); let resolve!: (stream: MediaStream) => void;
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise<MediaStream>(done => { resolve = done; }) } });
  const capture = new CameraCapture(video(), vi.fn(), vi.fn());
  const pending = capture.start(''); capture.stop(); resolve(stream); await pending;
  expect(track.stop).toHaveBeenCalledOnce(); expect(createTracker).not.toHaveBeenCalled();
});
test('stopping while the model loads releases camera immediately and closes a late tracker', async () => {
  const { stream, track } = media(), close = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
  let resolve!: (value: unknown) => void;
  createTracker.mockImplementation(() => new Promise(done => { resolve = done; }));
  const capture = new CameraCapture(video(), vi.fn(), vi.fn());
  const pending = capture.start(''); await vi.waitFor(() => expect(createTracker).toHaveBeenCalled());
  capture.stop(); expect(track.stop).toHaveBeenCalledOnce();
  resolve({ close }); await pending; expect(close).toHaveBeenCalledOnce();
});
test('camera inference is capped at 30 Hz, skips repeated frames and closes resources', async () => {
  const { stream, track } = media(), close = vi.fn(), detect = vi.fn(() => empty), state = vi.fn();
  let frame!: FrameRequestCallback;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => stream) } });
  createTracker.mockResolvedValue({ close, detect, delegate: 'CPU' });
  const source = video(), capture = new CameraCapture(source, vi.fn(), state);
  await capture.start('device'); frame(0); source.currentTime = 1; frame(10); frame(34); frame(68);
  expect(detect).toHaveBeenCalledTimes(2); expect(capture.timing.delegate).toBe('CPU');
  capture.stop(); expect(track.stop).toHaveBeenCalledOnce(); expect(close).toHaveBeenCalledOnce(); expect(source.srcObject).toBeNull();
});
test('permission denial produces a distinct camera status without creating a tracker', async () => {
  const state = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { throw new DOMException('', 'NotAllowedError'); }) } });
  await new CameraCapture(video(), vi.fn(), state).start('');
  expect(state).toHaveBeenLastCalledWith('cameraBlocked'); expect(createTracker).not.toHaveBeenCalled();
});
test('microphone permission cancellation releases tracks and permission denial is reported', async () => {
  const { stream, track } = media(); let resolve!: (stream: MediaStream) => void;
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise<MediaStream>(done => { resolve = done; }) } });
  const state = vi.fn(), mic = new MicrophoneCapture(state);
  const pending = mic.start(''); mic.stop(); resolve(stream); await pending;
  expect(track.stop).toHaveBeenCalledOnce(); expect(mic.level(1)).toBe(0);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async () => { throw new DOMException('', 'NotAllowedError'); }) } });
  await mic.start(''); expect(state).toHaveBeenLastCalledWith('micBlocked');
});
