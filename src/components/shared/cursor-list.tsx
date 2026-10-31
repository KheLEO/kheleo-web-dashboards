"use client";
import { Button } from "@/components/ui/button";
export function LoadMore({
  hasNext,
  loading,
  load,
}: {
  hasNext: boolean;
  loading: boolean;
  load: () => void;
}) {
  return hasNext ? (
    <div className="flex justify-center pt-4">
      <Button variant="secondary" disabled={loading} onClick={load}>
        {loading ? "Loading…" : "Load more"}
      </Button>
    </div>
  ) : null;
}
