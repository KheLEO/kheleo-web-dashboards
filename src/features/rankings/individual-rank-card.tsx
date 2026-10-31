"use client";
import { Card } from "@/components/ui/card";
import { useRank } from "./queries";
export function IndividualRankCard({ sport, district }: { sport: string; district?: string }) {
  const query = useRank(sport, district);
  return (
    <Card>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {district ? "District rank" : "National rank"}
      </p>
      <p className="mt-4 text-3xl font-semibold tabular-nums">
        {query.isPending
          ? "…"
          : query.error
            ? "Unavailable"
            : query.data.rank === null
              ? "Unranked"
              : `#${query.data.rank}`}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        {district ?? "Across India"} · {sport}
      </p>
    </Card>
  );
}
