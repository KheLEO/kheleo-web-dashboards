"use client";
import { useSyncExternalStore } from "react";
const subscribe = (): (() => void) => () => undefined;
export function useBrowserCapabilities() {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return {
    camera: ready && Boolean(navigator.mediaDevices?.getUserMedia),
    bluetooth: ready && "bluetooth" in navigator && window.isSecureContext,
    worker: ready && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined",
  };
}
