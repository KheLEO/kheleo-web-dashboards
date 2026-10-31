import "server-only";
export interface OperationalEvent {
  name: "upstream-unavailable" | "session-expired";
  requestId: string;
  status: number;
}
export function recordEvent(event: OperationalEvent): void {
  process.stderr.write(JSON.stringify({ ...event, timestamp: new Date().toISOString() }) + "\n");
}
