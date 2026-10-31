"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { joinPoolSchema } from "@/contracts/matchmaking";
import { sportRoles } from "@/features/athlete/sport-options";
import { SportTypeValues } from "@/contracts/enums.generated";
import { useTournament } from "@/features/tournaments/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { joinPool } from "./api";
export function JoinPoolForm({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string;
}) {
  const client = useQueryClient();
  const tournament = useTournament(tournamentId);
  if (tournament.isPending) return <Skeleton />;
  if (tournament.error) return <ErrorState error={tournament.error} />;
  const sport = SportTypeValues.find((entry) => entry === tournament.data.sport);
  if (!sport) return <p role="alert">This tournament’s sport is not supported.</p>;
  return (
    <SchemaForm
      schema={joinPoolSchema}
      fields={[
        {
          name: "primary_role",
          label: "Primary role",
          type: "select",
          options: sportRoles[sport],
          required: true,
        },
        {
          name: "secondary_role",
          label: "Secondary role (optional)",
          type: "select",
          options: sportRoles[sport],
        },
      ]}
      submitLabel="Join free-agent pool"
      submit={(_value, operation) => joinPool(tournamentId, bracketId, operation)}
      onSuccess={() => {
        void client.invalidateQueries({ queryKey: ["pool"] });
      }}
      successMessage="Pool entry confirmed. Your queue status will update automatically."
    />
  );
}
