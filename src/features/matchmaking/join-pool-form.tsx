"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { joinPoolSchema } from "@/contracts/matchmaking";
import { joinPool } from "./api";
export function JoinPoolForm({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string;
}) {
  const client = useQueryClient();
  return (
    <SchemaForm
      schema={joinPoolSchema}
      fields={[
        {
          name: "primary_role",
          label: "Primary role",
          required: true,
          hint: "Use your sport's role name, e.g. BATSMAN, BOWLER, DEFENDER.",
        },
        { name: "secondary_role", label: "Secondary role (optional)" },
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
