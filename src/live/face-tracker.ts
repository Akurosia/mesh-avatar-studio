import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export async function createFaceTracker() {
  const files = await FilesetResolver.forVisionTasks('/mediapipe');
  const options = { runningMode: 'VIDEO' as const, numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true };
  let tracker: FaceLandmarker;
  let delegate: 'GPU' | 'CPU' = 'GPU';
  try { tracker = await FaceLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate } }); }
  catch {
    delegate = 'CPU';
    tracker = await FaceLandmarker.createFromOptions(files, { ...options, baseOptions: { modelAssetPath: '/mediapipe/face_landmarker.task', delegate } });
  }
  return { delegate, detect: (video: HTMLVideoElement, now: number) => tracker.detectForVideo(video, now), close: () => tracker.close() };
}
