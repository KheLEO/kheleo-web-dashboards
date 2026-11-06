"use client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SchemaForm } from "@/components/ui/form";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { asApiError } from "@/lib/api/errors";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { ScoutDossierModal } from "@/components/scout/ScoutDossierModal";
import { SportTypeValues } from "@/contracts/enums.generated";
import { scoutFeedQuerySchema, type ScoutAlertProjection } from "@/contracts/scouting";
import { useSession } from "@/features/auth/session-provider";
import { useScoutAlerts } from "./queries";
import { acknowledgeAlert } from "./api";
export function AlertsList() {
  const { user } = useSession();
  const [filters, setFilters] = useState<{ sport?: string; district?: string }>({});
  const settledFilters = useDebouncedValue(filters, 300);
  const query = useScoutAlerts(settledFilters);
  const client = useQueryClient();
  const [failure, setFailure] = useState<Error | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const flight = useRef(false);
  const operations = useRef(new Map<string, MutationOperation>());
  useEffect(() => {
    const ids = new Set(query.data?.map((alert) => alert.id) ?? []);
    for (const id of operations.current.keys()) if (!ids.has(id)) operations.current.delete(id);
  }, [query.data]);
  async function acknowledge(id: string): Promise<void> {
    if (flight.current) return;
    flight.current = true;
    setPending(id);
    setFailure(null);
    const operation = operations.current.get(id) ?? createOperation({});
    operations.current.set(id, operation);
    try {
      const saved = await acknowledgeAlert(id, operation);
      operations.current.delete(id);
      client.setQueriesData<ScoutAlertProjection[]>(
        { queryKey: ["scout-alerts", user.id] },
        (previous) => previous?.map((alert) => (alert.id === id ? { ...alert, ...saved } : alert)),
      );
      await client.invalidateQueries({ queryKey: ["scout-alerts", user.id] });
    } catch (error: unknown) {
      setFailure(asApiError(error));
    } finally {
      flight.current = false;
      setPending(null);
    }
  }
  return (
    <div className="space-y-5">
      <Card>
        <SchemaForm
          fields={[
            { name: "sport", label: "Alert sport", type: "select", options: SportTypeValues },
            { name: "district", label: "Alert district" },
          ]}
          schema={scoutFeedQuerySchema.pick({ sport: true, district: true })}
          submitLabel="Apply alert filters"
          successMessage="Alert filters updated."
          submit={async (value) => {
            setFilters({
              ...(value.sport ? { sport: value.sport } : {}),
              ...(value.district ? { district: value.district } : {}),
            });
          }}
        />
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Latest 50 alerts · HTTP refresh every 30 seconds while visible.
        </p>
        <Button
          variant="secondary"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          Refresh alerts
        </Button>
      </div>
      {failure && <ErrorState error={failure} />}
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : query.data.length === 0 ? (
        <EmptyState>No talent alerts match these filters.</EmptyState>
      ) : (
        query.data.map((alert) => (
          <Card key={alert.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge>
                  {alert.sport} · Alert GTI {alert.gtiScore.toFixed(1)}
                </Badge>
                <h2 className="mt-4 text-lg font-semibold break-words">
                  {alert.athlete.email ??
                    alert.athlete.phone ??
                    `Athlete ${alert.athleteId.slice(0, 8)}`}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {alert.district}
                  {alert.athlete.athleteProfile ? `, ${alert.athlete.athleteProfile.state}` : ""}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Detected{" "}
                  <time dateTime={alert.createdAt}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </time>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ScoutDossierModal userId={alert.athleteId} />
                <Button asChild variant="secondary">
                  <Link href={`/scout/athletes/${alert.athleteId}`}>View passport</Link>
                </Button>
                <Button
                  disabled={alert.isAcknowledged || pending !== null}
                  onClick={() => {
                    void acknowledge(alert.id);
                  }}
                >
                  {pending === alert.id
                    ? "Acknowledging…"
                    : alert.isAcknowledged
                      ? "Acknowledged"
                      : "Acknowledge"}
                </Button>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              The alert projection omits previous GTI, verification and rural status. Open the
              authorized passport for returned identity status. Acknowledgement updates the platform
              alert; personal scout-specific read receipts are not available.
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
