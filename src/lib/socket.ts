"use client";
export { subscribeNamespace, disposeRealtime as disconnectSocket } from "./realtime/socket.client";
export type {
  Namespace,
  Room,
  RealtimeSubscription,
  ConnectionStatus,
} from "./realtime/socket.client";
