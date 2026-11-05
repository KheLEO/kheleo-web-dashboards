"use client";
import { useTournament } from "@/features/tournaments/queries";
import { useSession } from "@/features/auth/session-provider";
import { TournamentForm } from "@/features/tournaments/tournament-form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { Alert } from "@/components/ui/alert";
export function TournamentEdit({ tournamentId }: { tournamentId: string }) {
  const query = useTournament(tournamentId);
  const { user } = useSession();
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
  if (user.role === "ORGANIZER" && query.data.organizerId !== user.id)
    return <Alert danger>Access restricted: this tournament belongs to another organizer.</Alert>;
  return <TournamentForm key={query.data.id} tournament={query.data} />;
}
