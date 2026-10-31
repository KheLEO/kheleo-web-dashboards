"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type Webcam from "react-webcam";
import { createPoseEngine, type PoseEngine } from "./pose-engine.client";
import { drawLandmarks } from "./landmark-overlay";
import { kneeAngles } from "./joint-angles";
import { drillSessionReducer, initialDrillState } from "./session-reducer";
export function useDrillSession() {
  const [state, dispatch] = useReducer(drillSessionReducer, initialDrillState);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const webcam = useRef<Webcam | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const engine = useRef<PoseEngine | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const ready = useRef(false);
  const validFrames = useRef(0);
  const lastFrame = useRef(0);
  const lastSummary = useRef(0);
  const release = useCallback((): void => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    engine.current?.stop();
    engine.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    ready.current = false;
    busy.current = false;
  }, []);
  const stop = useCallback((): void => {
    release();
    setCameraEnabled(false);
    dispatch({ type: "stop" });
  }, [release]);
  useEffect(() => {
    const hidden = (): void => {
      if (document.hidden) stop();
    };
    window.addEventListener("kheleo:session-ended", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      release();
      window.removeEventListener("kheleo:session-ended", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [release, stop]);
  function fail(message: string): void {
    release();
    setCameraEnabled(false);
    dispatch({ type: "error", message });
  }
  function start(): void {
    release();
    validFrames.current = 0;
    lastFrame.current = 0;
    lastSummary.current = 0;
    dispatch({ type: "start" });
    setCameraEnabled(true);
  }
  function onStream(nextStream: MediaStream): void {
    stream.current = nextStream;
    const current = generation.current;
    try {
      engine.current = createPoseEngine((message) => {
        if (current !== generation.current) return;
        if (message.type === "closed") return;
        if (message.type === "ready") {
          ready.current = true;
          dispatch({ type: "ready" });
          return;
        }
        if (message.type === "error") {
          fail(message.message);
          return;
        }
        busy.current = false;
        if (canvas.current) drawLandmarks(canvas.current, message.landmarks);
        if (message.valid) validFrames.current++;
        if (performance.now() - lastSummary.current >= 200) {
          const angles = message.valid
            ? kneeAngles(message.worldLandmarks)
            : { left: null, right: null };
          dispatch({
            type: "frame",
            validFrames: validFrames.current,
            feedback: message.feedback,
            leftKnee: angles.left,
            rightKnee: angles.right,
          });
          lastSummary.current = performance.now();
        }
      });
      const loop = (timestamp: number): void => {
        if (current !== generation.current) return;
        frame.current = requestAnimationFrame(loop);
        const video = webcam.current?.video;
        if (
          !ready.current ||
          busy.current ||
          !video ||
          video.readyState < 2 ||
          timestamp - lastFrame.current < 1000 / 15
        )
          return;
        busy.current = true;
        lastFrame.current = timestamp;
        void createImageBitmap(video)
          .then((image) => {
            if (current !== generation.current || !engine.current) {
              image.close();
              return;
            }
            engine.current.sendFrame(image, timestamp);
          })
          .catch(() => {
            if (current === generation.current)
              fail("Unable to read camera frames in this browser.");
          });
      };
      frame.current = requestAnimationFrame(loop);
    } catch (error: unknown) {
      fail(error instanceof Error ? error.message : "Unable to start pose tracking.");
    }
  }
  return {
    state,
    webcam,
    canvas,
    cameraEnabled,
    start,
    stop,
    onStream,
    onCameraError: (error: string | DOMException) =>
      fail(typeof error === "string" ? error : error.message),
  };
}
