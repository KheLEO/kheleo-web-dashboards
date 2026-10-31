"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchemaForm } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { useTournament, useBrackets } from "@/features/tournaments/queries";
import { PoolStatus } from "./pool-status";
export interface MatchmakingTarget {
  tournamentId: string;
  bracketId: string;
}
function TournamentPool({
  tournamentId,
  initialBracket,
}: {
  tournamentId: string;
  initialBracket: string;
}) {
  const tournament = useTournament(tournamentId);
  const brackets = useBrackets(tournamentId);
  const [selected, setSelected] = useState(initialBracket);
  if (tournament.isPending || brackets.isPending) return <Skeleton />;
  if (tournament.error || brackets.error)
    return <ErrorState error={tournament.error ?? brackets.error!} />;
  const rows = brackets.data.pages.flatMap((page) => page.data);
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          {tournament.data.name || tournament.data.title} · {tournament.data.sport}
        </h2>
        <label className="field">
          Competition bracket
          <select
            className="control"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Select a bracket</option>
            {rows.map((bracket) => (
              <option value={bracket.id} key={bracket.id}>
                {bracket.name} · GTI {bracket.minGti}–{bracket.maxGti}
              </option>
            ))}
          </select>
        </label>
        <LoadMore
          hasNext={brackets.hasNextPage}
          loading={brackets.isFetchingNextPage}
          load={() => {
            void brackets.fetchNextPage();
          }}
        />
      </Card>
      {selected && rows.some((entry) => entry.id === selected) ? (
        <PoolStatus
          key={`${tournamentId}:${selected}`}
          tournamentId={tournamentId}
          bracketId={selected}
        />
      ) : (
        <EmptyState>Select a loaded bracket to view your actual queue status.</EmptyState>
      )}
    </div>
  );
}
export function MatchmakingHub({ initial }: { initial?: MatchmakingTarget }) {
  const [target, setTarget] = useState<{ tournamentId: string; bracketId: string } | null>(
    initial ?? null,
  );
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Choose your competition</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Start from a discovered tournament or enter its UUID. Sport and available brackets are
          fetched from the platform.
        </p>
        <SchemaForm
          fields={[{ name: "tournamentId", label: "Tournament UUID", required: true }]}
          schema={z.object({ tournamentId: z.uuid() })}
          defaults={{ tournamentId: initial?.tournamentId ?? "" }}
          submitLabel="Load competition"
          submit={async (value) => {
            setTarget({ tournamentId: value.tournamentId, bracketId: "" });
          }}
        />
        <Button asChild variant="ghost" className="mt-3">
          <Link href="/athlete/tournaments">Discover nearby tournaments</Link>
        </Button>
      </Card>
      {target && (
        <TournamentPool
          key={target.tournamentId}
          tournamentId={target.tournamentId}
          initialBracket={target.bracketId}
        />
      )}
    </div>
  );
}
