"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { asApiError } from "@/lib/api/errors";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { useScoutAlerts } from "./queries";
import { acknowledgeAlert } from "./api";
export function AlertsList() {
  const query = useScoutAlerts({});
  const client = useQueryClient();
  const [failure, setFailure] = useState<Error | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const operations = useRef(new Map<string, MutationOperation>());
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
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Latest 50 alerts · refreshes every 30 seconds while visible.
      </p>
      {failure && <ErrorState error={failure} />}
      {query.data.length === 0 ? (
        <EmptyState>No talent alerts are available.</EmptyState>
      ) : (
        query.data.map((alert) => (
          <Card key={alert.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge>
                  {alert.sport} · GTI {alert.gtiScore}
                </Badge>
                <h2 className="mt-4 text-lg font-semibold">
                  {alert.athlete.email ??
                    alert.athlete.phone ??
                    `Athlete ${alert.athleteId.slice(0, 8)}`}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{alert.district}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href={`/scout/athletes/${alert.athleteId}`}>View passport</Link>
                </Button>
                <Button
                  disabled={alert.isAcknowledged || pending !== null}
                  onClick={async () => {
                    setPending(alert.id);
                    setFailure(null);
                    const operation = operations.current.get(alert.id) ?? createOperation({});
                    operations.current.set(alert.id, operation);
                    try {
                      await acknowledgeAlert(alert.id, operation);
                      operations.current.delete(alert.id);
                      await client.invalidateQueries({ queryKey: ["scout-alerts"] });
                    } catch (error: unknown) {
                      setFailure(asApiError(error));
                    } finally {
                      setPending(null);
                    }
                  }}
                >
                  {alert.isAcknowledged ? "Acknowledged" : "Acknowledge"}
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
