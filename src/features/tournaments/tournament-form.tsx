"use client";
import { useRouter } from "next/navigation";
import { SchemaForm } from "@/components/ui/form";
import { createTournamentSchema } from "@/contracts/tournaments";
import { createTournament } from "./api";
import { tournamentFields } from "./schemas";
export function TournamentForm() {
  const router = useRouter();
  return (
    <SchemaForm
      fields={tournamentFields}
      schema={createTournamentSchema}
      defaults={{ minGti: "0", maxGti: "100", maxTeams: "16", teamSize: "11", prizePool: "0" }}
      submitLabel="Create tournament"
      submit={async (_value, operation) => {
        const tournament = await createTournament(operation);
        router.push(`/organizer/tournaments/${tournament.id}`);
      }}
    />
  );
}
