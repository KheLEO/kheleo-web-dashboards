import { io, type Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:3000";

export interface SocketClientOptions {
  namespace?: string;
  token?: string;
}

export function getSocket(options?: SocketClientOptions): Socket | null {
  if (typeof window === "undefined") {
    return null;
  }

  const namespace = options?.namespace ? `/${options.namespace.replace(/^\//, "")}` : "";
  const endpoint = `${SOCKET_URL}${namespace}`;

  if (!socketInstance) {
    socketInstance = io(endpoint, {
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ["websocket", "polling"],
      ...(options?.token ? { auth: { token: options.token } } : {}),
    });
  } else if (options?.token) {
    socketInstance.auth = { token: options.token };
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}
