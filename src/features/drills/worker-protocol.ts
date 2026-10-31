import type { Landmark } from "./joint-angles";
export type PoseWorkerInput =
  | { type: "init"; origin: string }
  | { type: "frame"; image: ImageBitmap; timestamp: number }
  | { type: "close" };
export type PoseWorkerOutput =
  | { type: "closed" }
  | { type: "ready" }
  | {
      type: "result";
      landmarks: Landmark[];
      worldLandmarks: Landmark[];
      valid: boolean;
      feedback: string;
    }
  | { type: "error"; message: string };
