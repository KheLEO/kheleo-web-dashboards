"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { createBracketSchema } from "@/contracts/tournaments";
import { createBracket } from "./api";
import { bracketFields } from "./schemas";
export function BracketForm({ tournamentId }: { tournamentId: string }) {
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={bracketFields}
      schema={createBracketSchema}
      defaults={{
        minGti: "0",
        maxGti: "100",
        entryFee: "0",
        maxTeams: "16",
        bracketType: "SINGLE_ELIMINATION",
      }}
      submitLabel="Create bracket"
      submit={(_value, operation) => createBracket(tournamentId, operation)}
      onSuccess={() => {
        void client.invalidateQueries({ queryKey: ["brackets"] });
        void client.invalidateQueries({ queryKey: ["tournament"] });
      }}
    />
  );
}
