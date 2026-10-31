"use client";
import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitDrillRequest } from "@/contracts/drills";
import { useSession } from "@/features/auth/session-provider";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ErrorState } from "@/components/shared/async-state";
import { submitDrill } from "./api";
export function PracticeSubmission({ summary }: { summary: SubmitDrillRequest | null }) {
  const { capabilities, user } = useSession();
  const client = useQueryClient();
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const mutation = useMutation({
    onSettled: () => {
      flight.current = false;
    },
    mutationFn: (action: MutationOperation) => submitDrill(action),
    onSuccess: () => {
      operation.current = null;
      void client.invalidateQueries({ queryKey: ["passport", user.id] });
    },
  });
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm">
        {summary
          ? `Practice alignment estimate: ${summary.form_score.toFixed(1)}/100 · ${summary.frames_analyzed} valid frames.`
          : "Stop a session with visible required joints to create a summary."}
      </p>
      {summary && (
        <details className="rounded border p-3 text-xs">
          <summary>Aggregated submission payload</summary>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </details>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Video and raw frames stay on-device. Shared HMAC secrets stay in the server relay.
        Provisional summaries can be submitted only to explicitly isolated staging, never production
        GTI.
      </p>
      {capabilities.drillPracticeIngestion && (
        <Button
          disabled={!summary || mutation.isPending || mutation.isSuccess}
          onClick={() => {
            if (!summary || flight.current) return;
            flight.current = true;
            if (operation.current?.body !== JSON.stringify(summary))
              operation.current = createOperation(summary);
            mutation.mutate(operation.current);
          }}
        >
          Submit practice summary to isolated staging
        </Button>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {mutation.data && (
        <Alert>
          Isolated staging submission accepted. Posture Practice Points:{" "}
          {mutation.data.posture_points_awarded}; updated Biomechanical Score:{" "}
          {mutation.data.current_biomechanical_score}.
        </Alert>
      )}
    </div>
  );
}
