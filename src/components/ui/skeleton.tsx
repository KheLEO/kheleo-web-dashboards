export function Skeleton() {
  return (
    <div role="status" className="rounded-xl border bg-card p-6">
      <span className="text-sm text-muted-foreground">Loading workspace data…</span>
      <div className="mt-4 h-20 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
    </div>
  );
}
