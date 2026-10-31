"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { formatDate, formatMoney } from "@/lib/format";
import { useTournament, useBrackets } from "./queries";
import { RegistrationDialog } from "./registration-dialog";
export function TournamentDetailView({
  tournamentId,
  area = "athlete",
  bracketId,
}: {
  tournamentId: string;
  area?: "athlete" | "organizer";
  bracketId?: string;
}) {
  const query = useTournament(tournamentId);
  const brackets = useBrackets(tournamentId);
  if (query.isPending) return <Skeleton />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const tournament = query.data;
  const rows = brackets.data?.pages.flatMap((page) => page.data) ?? [];
  const selected = bracketId ? rows.filter((bracket) => bracket.id === bracketId) : rows;
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge>{tournament.sport}</Badge>
          <Badge className="border-border bg-secondary text-muted-foreground">
            {tournament.status.replaceAll("_", " ")}
          </Badge>
        </div>
        <h2 className="text-2xl font-semibold">{tournament.name || tournament.title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {tournament.venueName} · {formatDate(tournament.startDate)} –{" "}
          {formatDate(tournament.endDate)}
        </p>
        <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Registration closes</p>
            <p className="mt-1 text-sm">{formatDate(tournament.registrationDeadline)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prize pool</p>
            <p className="mt-1 text-sm text-primary">
              {formatMoney(tournament.prizePool, tournament.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Team size / capacity</p>
            <p className="mt-1 text-sm">
              {tournament.teamSize} / {tournament.maxTeams} teams
            </p>
          </div>
        </div>
        {area === "organizer" && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/organizer/tournaments/${tournamentId}/brackets/new`}>
                Create bracket
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/organizer/tournaments/${tournamentId}/safety`}>
                Safety command center
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/organizer/tournaments/${tournamentId}/edit`}>Editing availability</Link>
            </Button>
          </div>
        )}
      </Card>
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          {bracketId ? "Selected bracket" : "Competition brackets"}
        </h2>
        {brackets.isPending ? (
          <Skeleton />
        ) : brackets.error ? (
          <ErrorState error={brackets.error} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {selected.map((bracket) => (
              <Card key={bracket.id}>
                <Badge>{bracket.tierName}</Badge>
                <h3 className="my-3 text-lg font-semibold">{bracket.name}</h3>
                <p className="text-sm text-muted-foreground">
                  GTI {bracket.minGti}–{bracket.maxGti} · {bracket.maxTeams} places
                </p>
                <p className="mb-5 mt-2 text-xs text-muted-foreground">
                  Entry fee {formatMoney(bracket.entryFee, tournament.currency)} ·{" "}
                  {bracket.bracketType.replaceAll("_", " ")}
                </p>
                {area === "athlete" && (
                  <div className="flex flex-wrap gap-2">
                    <RegistrationDialog tournamentId={tournamentId} bracketId={bracket.id} />
                    <Button asChild variant="secondary">
                      <Link
                        href={`/athlete/tournaments/${tournamentId}/brackets/${bracket.id}/pool`}
                      >
                        Free-agent pool
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        {!brackets.isPending && !brackets.error && selected.length === 0 && (
          <EmptyState>
            {bracketId
              ? "Bracket not in the loaded pages. Load more brackets to locate it."
              : "No brackets have been published yet."}
          </EmptyState>
        )}
        <LoadMore
          hasNext={brackets.hasNextPage}
          loading={brackets.isFetchingNextPage}
          load={() => {
            void brackets.fetchNextPage();
          }}
        />
      </div>
    </div>
  );
}
