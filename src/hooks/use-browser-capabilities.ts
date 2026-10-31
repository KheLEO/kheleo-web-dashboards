"use client";
import { useSyncExternalStore } from "react";
const subscribe = (): (() => void) => () => undefined;
export function useBrowserCapabilities() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const browser = ready && typeof window !== "undefined" && typeof navigator !== "undefined";
  return {
    camera: browser && window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia),
    bluetooth: browser && "bluetooth" in navigator && window.isSecureContext,
    worker: browser && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined",
  };
}
