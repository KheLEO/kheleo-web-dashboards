"use client";
import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PoseSubmission } from "@/contracts/drills";
import { useSession } from "@/features/auth/session-provider";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ErrorState } from "@/components/shared/async-state";
import { computePoseDigest } from "./preset-evaluation";
import { submitDrill } from "./api";
export function PracticeSubmission({ summary }: { summary: PoseSubmission | null }) {
  const { capabilities, user } = useSession();
  const client = useQueryClient();
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const mutation = useMutation({
    onSettled: () => {
      flight.current = false;
    },
    mutationFn: async (action: MutationOperation) => {
      if (!summary) throw new Error("Record a drill session first.");
      return submitDrill(action, await computePoseDigest(summary.pose_frames));
    },
    onSuccess: () => {
      operation.current = null;
      void client.invalidateQueries({ queryKey: ["passport", user.id] });
    },
  });
  return (
    <div className="mt-5 space-y-4">
      <p className="text-sm">
        {summary
          ? `Form score: ${summary.form_score.toFixed(1)}/100 · ${summary.frames_analyzed} valid frames.`
          : "Stop a session with visible required joints to create a summary."}
      </p>
      {summary && summary.joint_angles_summary?.validated !== true && (
        <Alert>
          Complete at least 30 visible frames and two movements at the preset cadence before
          submitting.
        </Alert>
      )}
      {summary && (
        <details className="rounded border p-3 text-xs">
          <summary>Aggregated submission payload</summary>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words">
            {JSON.stringify(
              { ...summary, pose_frames: `${summary.pose_frames.length} landmark frames` },
              null,
              2,
            )}
          </pre>
        </details>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        Video stays on-device. Submitting shares pose landmarks for score validation and awards
        Posture Practice Points using scoring policy 1.0.0.
      </p>
      {capabilities.drillPracticeIngestion && (
        <Button
          disabled={
            !summary ||
            summary.joint_angles_summary?.validated !== true ||
            mutation.isPending ||
            mutation.isSuccess
          }
          onClick={() => {
            if (!summary || flight.current) return;
            flight.current = true;
            if (operation.current?.body !== JSON.stringify(summary))
              operation.current = createOperation(summary);
            mutation.mutate(operation.current);
          }}
        >
          Submit drill for practice points
        </Button>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {mutation.data && (
        <Alert>
          Drill accepted. Posture Practice Points: {mutation.data.posture_points_awarded}; updated
          Biomechanical Score: {mutation.data.current_biomechanical_score}.
        </Alert>
      )}
    </div>
  );
}
