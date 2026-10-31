"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { ConnectionStatusBadge } from "@/components/shared/connection-status";
import { ApiError, asApiError } from "@/lib/api/errors";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { usePool } from "./queries";
import { useRosterEvents } from "./use-roster-events";
import { JoinPoolForm } from "./join-pool-form";
import { RosterCard } from "./roster-card";
import { leavePool } from "./api";
export function PoolStatus({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string;
}) {
  const query = usePool(tournamentId, bracketId);
  const status = useRosterEvents(tournamentId, bracketId);
  const client = useQueryClient();
  const [failure, setFailure] = useState<Error | null>(null);
  const [leaving, setLeaving] = useState(false);
  const operation = useRef<MutationOperation | null>(null);
  const absent = query.error instanceof ApiError && query.error.problem.status === 404;
  return (
    <div className="space-y-5">
      <ConnectionStatusBadge status={status} />
      {query.isPending ? (
        <Skeleton />
      ) : absent || query.data?.status === "CANCELLED" ? (
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Find a complementary team</h2>
          <JoinPoolForm tournamentId={tournamentId} bracketId={bracketId} />
        </Card>
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        query.data && (
          <>
            <Card>
              <Badge>{query.data.status}</Badge>
              <h2 className="mt-5 text-2xl font-semibold">
                {query.data.status === "MATCHED"
                  ? "Your roster is ready"
                  : query.data.status === "MATCHING"
                    ? "Matching complementary positions"
                    : `Queue position ${query.data.waitPosition}`}
              </h2>
              <p className="my-4 text-sm text-muted-foreground">
                {query.data.primaryRole} · {query.data.sport}
              </p>
              {query.data.status === "QUEUED" && (
                <Button
                  variant="secondary"
                  disabled={leaving}
                  onClick={async () => {
                    setLeaving(true);
                    setFailure(null);
                    operation.current ??= createOperation({});
                    try {
                      await leavePool(tournamentId, bracketId, operation.current);
                      operation.current = null;
                      await client.invalidateQueries({ queryKey: ["pool"] });
                    } catch (error: unknown) {
                      setFailure(asApiError(error));
                    } finally {
                      setLeaving(false);
                    }
                  }}
                >
                  Leave queue
                </Button>
              )}
            </Card>
            {query.data.roster && (
              <RosterCard name={query.data.teamName ?? "Matched team"} roster={query.data.roster} />
            )}
          </>
        )
      )}
      {failure && <ErrorState error={failure} />}
    </div>
  );
}
