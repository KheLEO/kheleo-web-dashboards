"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { useAdminDashboard } from "./queries";
import { FrontendConnectivity } from "./frontend-connectivity";
const latency = (value: number | null) =>
  value === null ? "Probe failed" : `${value.toFixed(2)} ms`;
export function SystemHealth() {
  const query = useAdminDashboard();
  return (
    <div className="space-y-6">
      <FrontendConnectivity />
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Backend subsystem health</h2>
            <Badge>{query.data.health.status}</Badge>
          </div>
          <dl className="grid gap-5 text-sm sm:grid-cols-3">
            <div>
              <dt>PostgreSQL latency</dt>
              <dd>
                {latency(query.data.dbLatencyMs)} · {query.data.health.db}
              </dd>
            </div>
            <div>
              <dt>PostGIS extension</dt>
              <dd>
                {query.data.postgisAvailable ? "Available" : "Probe failed"} ·{" "}
                {latency(query.data.postgisLatencyMs)}
              </dd>
            </div>
            <div>
              <dt>Redis latency</dt>
              <dd>
                {latency(query.data.redisLatencyMs)} · {query.data.health.redis}
              </dd>
            </div>
          </dl>
          <h3 className="mb-3 mt-7 font-semibold">BullMQ queues</h3>
          <Table>
            <caption className="sr-only">Live queue health and job counts</caption>
            <thead>
              <tr>
                <th>Queue</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Waiting</th>
                <th>Active</th>
                <th>Delayed</th>
                <th>Failed</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {query.data.bullmqQueuesStatus.map((queue) => (
                <tr key={queue.name}>
                  <td>{queue.name}</td>
                  <td>{queue.status}</td>
                  <td>{latency(queue.latencyMs)}</td>
                  <td>{queue.waiting ?? "Not measured"}</td>
                  <td>{queue.active ?? "Not measured"}</td>
                  <td>{queue.delayed ?? "Not measured"}</td>
                  <td>{queue.failed ?? "Not measured"}</td>
                  <td>{queue.completed ?? "Not measured"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            Observed {new Date(query.data.observedAt).toLocaleString()} · refreshes every 30
            seconds. Latencies are measured probes; queue counts do not establish worker throughput.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            Refresh subsystem health
          </Button>
        </Card>
      )}
    </div>
  );
}
