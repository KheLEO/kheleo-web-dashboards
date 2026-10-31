"use client";
import type { PoseWorkerInput, PoseWorkerOutput } from "./worker-protocol";
export interface PoseEngine {
  sendFrame(image: ImageBitmap, timestamp: number): void;
  stop(): void;
}
export function createPoseEngine(onMessage: (message: PoseWorkerOutput) => void): PoseEngine {
  const worker = new Worker(new URL("./pose.worker.ts", import.meta.url), { type: "module" });
  let stopped = false;
  let closing: ReturnType<typeof setTimeout> | null = null;
  worker.onmessage = (event: MessageEvent<PoseWorkerOutput>): void => {
    if (event.data.type === "closed") {
      if (closing) clearTimeout(closing);
      worker.terminate();
      return;
    }
    if (!stopped) onMessage(event.data);
  };
  worker.onerror = (): void =>
    onMessage({
      type: "error",
      message: "The pose worker failed. Check model assets and browser support.",
    });
  worker.postMessage({ type: "init", origin: window.location.origin } satisfies PoseWorkerInput);
  return {
    sendFrame(image, timestamp) {
      worker.postMessage({ type: "frame", image, timestamp } satisfies PoseWorkerInput, [image]);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      worker.postMessage({ type: "close" } satisfies PoseWorkerInput);
      closing = setTimeout(() => worker.terminate(), 200);
    },
  };
}
