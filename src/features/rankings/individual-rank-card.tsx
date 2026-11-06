"use client";
import { ErrorState } from "@/components/shared/async-state";
import { Card } from "@/components/ui/card";
import { useRank } from "./queries";
export function IndividualRankCard({ sport, district }: { sport: string; district?: string }) {
  const query = useRank(sport, district);
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <Card>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {district ? "District rank" : "National rank"}
      </p>
      <p className="mt-4 text-3xl font-semibold tabular-nums">
        {query.isPending ? "…" : query.data.rank === null ? "Unranked" : `#${query.data.rank}`}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {district ?? "Across India"} · {sport}
      </p>
    </Card>
  );
}
