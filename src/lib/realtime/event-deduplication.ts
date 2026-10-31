export class EventDeduplicator {
  private readonly seen = new Map<string, number>();
  constructor(
    private readonly ttlMs = 60000,
    private readonly capacity = 200,
  ) {}
  accept(key: string, now = Date.now()): boolean {
    for (const [id, time] of this.seen) if (now - time >= this.ttlMs) this.seen.delete(id);
    if (this.seen.has(key)) return false;
    if (this.seen.size >= this.capacity) {
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    this.seen.set(key, now);
    return true;
  }
}
