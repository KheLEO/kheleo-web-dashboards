"use client";
import { useEffect, useRef, useState } from "react";
import type { BiometricReading, BiometricSource } from "./types";
export function useWearable() {
  const source = useRef<BiometricSource | null>(null);
  const connecting = useRef(false);
  const generation = useRef(0);
  const [readings, setReadings] = useState<BiometricReading[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  function stop(): void {
    generation.current++;
    source.current?.stop();
    source.current = null;
    setStatus("idle");
  }
  useEffect(() => {
    const terminate = (): void => {
      generation.current++;
      source.current?.stop();
      source.current = null;
      setStatus("idle");
    };
    const visibility = (): void => {
      if (document.hidden) terminate();
    };
    window.addEventListener("kheleo:session-ended", terminate);
    document.addEventListener("visibilitychange", visibility);
    const dispose = (): void => {
      generation.current++;
      source.current?.stop();
      source.current = null;
    };
    return () => {
      dispose();
      window.removeEventListener("kheleo:session-ended", terminate);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  async function connect(next: BiometricSource): Promise<void> {
    if (connecting.current) return;
    connecting.current = true;
    stop();
    const current = generation.current;
    source.current = next;
    setReadings([]);
    setError(null);
    setStatus("connecting");
    try {
      await next.start(
        (reading) => {
          if (generation.current !== current) return;
          setStatus("connected");
          setReadings((previous) => [...previous.slice(-59), reading]);
        },
        (failure) => {
          if (generation.current !== current) return;
          setError(failure);
          stop();
        },
      );
      if (generation.current === current) setStatus("connected");
    } catch (failure: unknown) {
      if (generation.current === current) {
        setError(failure instanceof Error ? failure : new Error("Unable to connect wearable."));
        stop();
      }
    } finally {
      connecting.current = false;
    }
  }
  return { readings, latest: readings.at(-1), error, status, connect, stop };
}
