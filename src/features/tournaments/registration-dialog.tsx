"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/errors";
import { sameOperation, type MutationOperation } from "@/lib/api/operation";
import { registerBracketSchema } from "@/contracts/tournaments";
import { registerBracket } from "./api";
export function RegistrationDialog({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string;
}) {
  const [teamId, setTeamId] = useState("");
  const [invalid, setInvalid] = useState(false);
  const operation = useRef<MutationOperation | null>(null);
  const mutation = useMutation({
    mutationFn: (input: MutationOperation) => registerBracket(tournamentId, bracketId, input),
  });
  const problem = mutation.error instanceof ApiError ? mutation.error.problem : null;
  return (
    <Dialog
      trigger={<Button>Register for this bracket</Button>}
      title="Confirm bracket registration"
      description="The platform checks your GTI and bracket capacity. Entry fees are configured by the organizer; no payment is collected here."
    >
      <label className="field">
        Team UUID (optional)
        <input
          className="control"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        />
      </label>
      {invalid && (
        <p role="alert" className="mt-3 text-sm">
          Enter a valid team UUID or leave it empty.
        </p>
      )}
      {mutation.error && (
        <div className="my-4">
          <Alert danger>
            <p>
              {problem?.code ? `${problem.code}: ` : ""}
              {mutation.error.message}
            </p>
            {problem?.suggestedBracketId && (
              <Link
                className="mt-2 block underline"
                href={`/athlete/tournaments/${tournamentId}/brackets/${problem.suggestedBracketId}`}
              >
                View suggested {problem.suggestedBracketTier ?? "higher-tier"} bracket
              </Link>
            )}
          </Alert>
        </div>
      )}
      {mutation.data ? (
        <div className="mt-4">
          <Alert>
            Registration {mutation.data.status.toLowerCase()}. Reference:{" "}
            {mutation.data.registrationId}
          </Alert>
        </div>
      ) : (
        <Button
          className="mt-5"
          disabled={mutation.isPending}
          onClick={() => {
            const result = registerBracketSchema.safeParse(
              teamId.trim() ? { teamId: teamId.trim() } : {},
            );
            setInvalid(!result.success);
            if (!result.success) return;
            operation.current = sameOperation(operation.current, result.data);
            mutation.mutate(operation.current);
          }}
        >
          {mutation.isPending ? "Registering…" : "Confirm registration"}
        </Button>
      )}
    </Dialog>
  );
}
