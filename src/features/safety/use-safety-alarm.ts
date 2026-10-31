"use client";
import { useEffect, useRef, useState } from "react";
export function useSafetyAlarm(active: boolean) {
  const context = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const visibility = (): void => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      const current = context.current;
      context.current = null;
      if (current && current.state !== "closed") void current.close();
    };
  }, []);
  useEffect(() => {
    const current = context.current;
    if (!enabled || !active || !visible || !current || current.state === "closed") return;
    const oscillator = current.createOscillator();
    const gain = current.createGain();
    gain.gain.value = 0.08;
    oscillator.type = "sine";
    oscillator.frequency.value = 700;
    oscillator.connect(gain);
    gain.connect(current.destination);
    oscillator.start();
    let high = false;
    const timer = window.setInterval(() => {
      high = !high;
      oscillator.frequency.value = high ? 1000 : 700;
    }, 500);
    return () => {
      clearInterval(timer);
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    };
  }, [enabled, active, visible]);
  async function toggle(): Promise<void> {
    if (enabled) {
      setEnabled(false);
      return;
    }
    if (typeof window === "undefined" || typeof window.AudioContext !== "function") {
      setError("Audible alerts are unavailable in this browser. Visual alerts remain active.");
      return;
    }
    try {
      context.current ??= new AudioContext();
      const current = context.current;
      await current.resume();
      if (current.state !== "closed") {
        setError(null);
        setEnabled(true);
      }
    } catch (failure: unknown) {
      setError(
        failure instanceof Error ? failure.message : "Audio could not start. Use the visual alert.",
      );
    }
  }
  return { enabled, error, toggle };
}
