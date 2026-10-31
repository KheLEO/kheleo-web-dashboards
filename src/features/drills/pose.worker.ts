import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseWorkerInput, PoseWorkerOutput } from "./worker-protocol";
import type { Landmark } from "./joint-angles";
interface WorkerContext {
  postMessage(message: PoseWorkerOutput): void;
  onmessage: ((event: MessageEvent<PoseWorkerInput>) => void) | null;
}
const context = self as unknown as WorkerContext;
let landmarker: PoseLandmarker | null = null;
function mapLandmarks(
  points: Array<{ x: number; y: number; z: number; visibility?: number }>,
): Landmark[] {
  return points.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: point.visibility ?? 0,
  }));
}
context.onmessage = (event: MessageEvent<PoseWorkerInput>): void => {
  const message = event.data;
  if (message.type === "close") {
    landmarker?.close();
    landmarker = null;
    context.postMessage({ type: "closed" });
    return;
  }
  if (message.type === "init") {
    void (async () => {
      try {
        const files = await FilesetResolver.forVisionTasks(`${message.origin}/mediapipe/wasm`);
        landmarker = await PoseLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: `${message.origin}/models/pose_landmarker_lite.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numPoses: 2,
          minPoseDetectionConfidence: 0.6,
          minPosePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          outputSegmentationMasks: false,
        });
        context.postMessage({ type: "ready" });
      } catch (error: unknown) {
        context.postMessage({
          type: "error",
          message: error instanceof Error ? error.message : "Pose engine could not initialize.",
        });
      }
    })();
    return;
  }
  try {
    if (!landmarker) throw new Error("Pose engine is not ready.");
    const result = landmarker.detectForVideo(message.image, message.timestamp);
    const landmarks = mapLandmarks(result.landmarks[0] ?? []);
    const worldLandmarks = mapLandmarks(result.worldLandmarks[0] ?? []);
    const valid =
      result.landmarks.length === 1 &&
      landmarks.length === 33 &&
      [11, 12, 23, 24, 25, 26, 27, 28].every((index) => (landmarks[index]?.visibility ?? 0) >= 0.6);
    const feedback =
      result.landmarks.length > 1
        ? "Only one athlete should be in view."
        : valid
          ? "Tracking your movement. Keep your full body visible."
          : "Step back until your shoulders, hips, knees, and ankles are visible.";
    context.postMessage({ type: "result", landmarks, worldLandmarks, valid, feedback });
  } catch (error: unknown) {
    context.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Pose inference failed.",
    });
  } finally {
    message.image.close();
  }
};
