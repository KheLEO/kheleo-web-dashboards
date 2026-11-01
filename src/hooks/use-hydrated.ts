"use client";
import { useSyncExternalStore } from "react";
const subscribe = (): (() => void) => () => undefined;
const clientSnapshot = (): boolean => true;
const serverSnapshot = (): boolean => false;
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
