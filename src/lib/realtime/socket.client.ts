"use client";
import { Manager, type Socket } from "socket.io-client";
import { z } from "zod";
import { browserClient } from "@/lib/api/browser-client";
import { resolveSocketOrigin } from "@/lib/socket-origin";
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type Namespace = "/ws/matchmaking" | "/ws/events";
interface IncomingEvents {
  ROSTER_FORMED: (value: unknown) => void;
  MATCH_PAUSE_ALERT: (value: unknown) => void;
  GTI_UPDATED: (value: unknown) => void;
}
interface OutgoingEvents {
  "join:user": (value: { userId: string }) => void;
  "join:bracket": (value: { bracketId: string }) => void;
  "join:athlete": (value: { athleteId: string }) => void;
  "join:tournament": (value: { tournamentId: string }) => void;
  "join:match": (value: { matchId: string }) => void;
}
export type Room =
  | { event: "join:user"; id: string }
  | { event: "join:bracket"; id: string }
  | { event: "join:athlete"; id: string }
  | { event: "join:tournament"; id: string }
  | { event: "join:match"; id: string };
export interface RealtimeSubscription {
  rooms: Room[];
  events: Partial<IncomingEvents>;
  status: (status: ConnectionStatus) => void;
  connected?: () => void;
}
interface Entry {
  socket: Socket<IncomingEvents, OutgoingEvents>;
  consumers: Map<symbol, RealtimeSubscription>;
  timer: ReturnType<typeof setTimeout> | null;
  controller: AbortController | null;
  generation: number;
}
let manager: Manager | null = null;
const entries = new Map<Namespace, Entry>();
const tokenSchema = z.object({ token: z.string(), expiresAt: z.number() });
function joinRooms(entry: Entry): void {
  const joined = new Set<string>();
  for (const subscription of entry.consumers.values())
    for (const room of subscription.rooms) {
      const key = `${room.event}:${room.id}`;
      if (joined.has(key)) continue;
      joined.add(key);
      switch (room.event) {
        case "join:user":
          entry.socket.emit(room.event, { userId: room.id });
          break;
        case "join:bracket":
          entry.socket.emit(room.event, { bracketId: room.id });
          break;
        case "join:athlete":
          entry.socket.emit(room.event, { athleteId: room.id });
          break;
        case "join:tournament":
          entry.socket.emit(room.event, { tournamentId: room.id });
          break;
        case "join:match":
          entry.socket.emit(room.event, { matchId: room.id });
          break;
      }
    }
}
function status(entry: Entry, value: ConnectionStatus): void {
  for (const consumer of entry.consumers.values()) consumer.status(value);
}
async function authenticate(entry: Entry): Promise<void> {
  const generation = ++entry.generation;
  entry.controller?.abort();
  entry.controller = new AbortController();
  if (entry.timer) clearTimeout(entry.timer);
  status(entry, "connecting");
  try {
    const response = await browserClient.get<unknown>("/session/socket-token", {
      signal: entry.controller.signal,
    });
    if (generation !== entry.generation || !entry.consumers.size) return;
    const token = tokenSchema.parse(response.data);
    entry.socket.auth = { token: token.token };
    entry.socket.disconnect().connect();
    entry.timer = setTimeout(
      () => {
        void authenticate(entry);
      },
      Math.max(1000, token.expiresAt - Date.now() - 30000),
    );
  } catch {
    if (generation === entry.generation && entry.consumers.size) status(entry, "error");
  }
}
export function disposeRealtime(): void {
  for (const entry of entries.values()) {
    entry.generation++;
    entry.controller?.abort();
    if (entry.timer) clearTimeout(entry.timer);
    entry.socket.removeAllListeners();
    entry.socket.disconnect();
    entry.consumers.clear();
  }
  entries.clear();
  manager = null;
  if (typeof window !== "undefined")
    window.removeEventListener("kheleo:session-ended", disposeRealtime);
}
export function subscribeNamespace(
  namespace: Namespace,
  subscription: RealtimeSubscription,
): () => void {
  if (typeof window === "undefined") throw new Error("Realtime is available only in the browser.");
  if (!manager) {
    manager = new Manager(
      resolveSocketOrigin(process.env.NEXT_PUBLIC_SOCKET_ORIGIN ?? process.env.NEXT_PUBLIC_WS_URL),
      {
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      },
    );
    window.addEventListener("kheleo:session-ended", disposeRealtime);
  }
  let entry = entries.get(namespace);
  if (!entry) {
    entry = {
      socket: manager.socket(namespace) as Socket<IncomingEvents, OutgoingEvents>,
      consumers: new Map(),
      timer: null,
      controller: null,
      generation: 0,
    };
    const current = entry;
    current.socket.on("connect", () => {
      joinRooms(current);
      status(current, "connected");
      for (const consumer of current.consumers.values()) consumer.connected?.();
    });
    current.socket.on("disconnect", () => status(current, "disconnected"));
    current.socket.on("connect_error", () => status(current, "error"));
    current.socket.on("ROSTER_FORMED", (value) => {
      for (const consumer of current.consumers.values()) consumer.events.ROSTER_FORMED?.(value);
    });
    current.socket.on("MATCH_PAUSE_ALERT", (value) => {
      for (const consumer of current.consumers.values()) consumer.events.MATCH_PAUSE_ALERT?.(value);
    });
    current.socket.on("GTI_UPDATED", (value) => {
      for (const consumer of current.consumers.values()) consumer.events.GTI_UPDATED?.(value);
    });
    entries.set(namespace, current);
  }
  const id = Symbol();
  const current = entry;
  current.consumers.set(id, subscription);
  void authenticate(current);
  return () => {
    current.consumers.delete(id);
    if (current.consumers.size) {
      current.socket.disconnect().connect();
      return;
    }
    current.generation++;
    current.controller?.abort();
    if (current.timer) clearTimeout(current.timer);
    current.socket.removeAllListeners();
    current.socket.disconnect();
    entries.delete(namespace);
    if (!entries.size) {
      manager = null;
      window.removeEventListener("kheleo:session-ended", disposeRealtime);
    }
  };
}
