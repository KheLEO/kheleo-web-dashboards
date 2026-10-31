import type { TelemetryRequest } from "@/contracts/safety";
import { classifyVitals } from "@/contracts/safety";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
interface QueuedReading {
  reading: TelemetryRequest;
  operation: MutationOperation;
}
export class TelemetryDispatcher {
  private inFlight = false;
  private stopped = false;
  private lastSent = -Infinity;
  private pending: QueuedReading | null = null;
  private failed: QueuedReading | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private readonly send: (operation: MutationOperation) => Promise<unknown>,
    private readonly onError: (error: unknown) => void,
  ) {}
  push(reading: TelemetryRequest): void {
    if (this.stopped) return;
    const critical = classifyVitals(reading) === "CRITICAL";
    if (this.pending && classifyVitals(this.pending.reading) === "CRITICAL" && !critical) return;
    this.pending = { reading, operation: createOperation(reading) };
    this.schedule();
  }
  retry(): void {
    if (this.failed && !this.stopped) {
      this.pending = this.failed;
      this.failed = null;
      this.schedule();
    }
  }
  private schedule(): void {
    if (this.stopped || this.inFlight || this.failed || !this.pending) return;
    if (this.timer) clearTimeout(this.timer);
    const delay =
      classifyVitals(this.pending.reading) === "CRITICAL"
        ? 0
        : Math.max(0, 5000 - (Date.now() - this.lastSent));
    this.timer = setTimeout(() => {
      void this.dispatch();
    }, delay);
  }
  private async dispatch(): Promise<void> {
    if (this.stopped || !this.pending || this.inFlight) return;
    const next = this.pending;
    this.pending = null;
    this.inFlight = true;
    this.lastSent = Date.now();
    try {
      await this.send(next.operation);
    } catch (error: unknown) {
      this.failed = next;
      this.onError(error);
    } finally {
      this.inFlight = false;
      this.schedule();
    }
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.pending = null;
    this.failed = null;
  }
}
