"use client";
import { createContext, useContext, type ReactNode } from "react";
import { subscribeNamespace } from "@/lib/socket";
interface SocketContextValue {
  subscribe: typeof subscribeNamespace;
}
const SocketContext = createContext<SocketContextValue>({ subscribe: subscribeNamespace });
export function SocketProvider({ children }: { children: ReactNode }) {
  return (
    <SocketContext.Provider value={{ subscribe: subscribeNamespace }}>
      {children}
    </SocketContext.Provider>
  );
}
export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
