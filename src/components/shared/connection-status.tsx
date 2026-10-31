import type { ConnectionStatus } from "@/lib/realtime/socket.client";
export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 text-xs ${status === "connected" ? "text-success" : "text-muted-foreground"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-success" : "bg-warning"}`}
      />
      {status === "connected"
        ? "Live connection"
        : status === "error"
          ? "Live connection unavailable"
          : status === "connecting"
            ? "Connecting…"
            : "Stream disconnected"}
    </span>
  );
}
