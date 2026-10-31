"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/useAuthStore";

export type SocketConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  status: SocketConnectionStatus;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  status: "disconnected",
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>("disconnected");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Only connect when user is actively authenticated
    if (!isAuthenticated || !token) {
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
        setStatus("disconnected");
      }
      return;
    }

    const s = getSocket({ token });
    if (!s) return;

    setSocket(s);
    setStatus("connecting");

    const onConnect = () => {
      setIsConnected(true);
      setStatus("connected");
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setStatus("disconnected");
    };

    const onConnectError = () => {
      setIsConnected(false);
      setStatus("error");
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    s.connect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, status }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}
