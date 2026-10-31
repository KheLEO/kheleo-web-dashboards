"use client";
import { useTournament } from "@/features/tournaments/queries";
import { TournamentDetailView } from "@/features/tournaments/tournament-detail";
import { BracketForm } from "@/features/tournaments/bracket-form";
import { useSession } from "@/features/auth/session-provider";
import { DependencyState } from "@/components/shared/dependency-state";
export function BracketWorkspace({ tournamentId }: { tournamentId: string }) {
  const event = useTournament(tournamentId);
  const { user } = useSession();
  const mayCreate =
    event.data && (event.data.organizerId === user.id || user.role === "SUPER_ADMIN");
  return (
    <div className="space-y-6">
      <TournamentDetailView tournamentId={tournamentId} area="organizer" />
      {mayCreate && <BracketForm tournamentId={tournamentId} />}
      <DependencyState
        title="Verified rosters and free-agent queue inspector"
        description="Organizer reads for registrations, teams, verification projections and bracket queue totals are unavailable. Athlete self-service pool status cannot be used to inspect other players. A manual BullMQ matchmaking trigger is not exposed."
      />
      <DependencyState
        title="Anti-sandbagging audit log"
        description="Registration conflicts are returned to the registering athlete. No organizer audit stream or persisted blocked-attempt listing exists; no log entries are fabricated."
      />
      <DependencyState
        title="Fixtures and verified match results"
        description="Fixture reads, winner/score submission, and authorized umpire verification require backend APIs before results can update the match-performance component of GTI."
      />
    </div>
  );
}
