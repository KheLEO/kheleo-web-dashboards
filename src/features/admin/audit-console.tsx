"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  AuditSeverityValues,
  type AuditCategory,
  type AuditSeverity,
} from "@/contracts/enums.generated";
import type { SecurityAuditEvent } from "@/contracts/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { useAuditLogs } from "./queries";
interface AuditTab {
  label: string;
  category?: AuditCategory;
}
const tabs: readonly AuditTab[] = [
  { label: "All Events" },
  { label: "Gov-ID Anti-Reset", category: "GOV_ID_RESET" },
  { label: "Edge-AI HMAC Tamper", category: "DRILL_HMAC_TAMPER" },
  { label: "Anti-Sandbagging Blocks", category: "SANDBAGGING_BLOCKED" },
  { label: "IoT Safety Match Pauses", category: "SAFETY_MATCH_PAUSE" },
  { label: "Governance", category: "ROLE_GOVERNANCE" },
];
function AuditMetadataDrawer({ event }: { event: SecurityAuditEvent }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" aria-label={`View metadata for ${event.id}`}>
          View metadata
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l bg-background p-5 shadow-xl sm:p-8">
          <Dialog.Title className="pr-8 text-xl font-semibold">
            Immutable audit metadata
          </Dialog.Title>
          <Dialog.Description className="my-4 break-all text-sm">
            Record {event.id} · {event.category} · {event.severity}
          </Dialog.Description>
          <pre className="max-h-[75dvh] overflow-auto whitespace-pre-wrap break-words rounded border p-4 text-xs">
            {JSON.stringify(event.metadata, null, 2)}
          </pre>
          <p className="mt-4 break-all text-xs">IP hash: {event.ipHash ?? "Not captured"}</p>
          <Dialog.Close
            aria-label="Close audit metadata"
            className="absolute right-4 top-4 rounded p-2"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
interface AuditConsoleProps {
  initialCategory?: AuditCategory;
}
export function AuditConsole({ initialCategory }: AuditConsoleProps) {
  const [category, setCategory] = useState<AuditCategory | undefined>(initialCategory);
  const [severity, setSeverity] = useState<AuditSeverity | "">("");
  const query = useAuditLogs({
    ...(category ? { category } : {}),
    ...(severity ? { severity } : {}),
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const governance = category === "ROLE_GOVERNANCE" || category === "TOURNAMENT_MODERATION";
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-5 text-xl font-semibold">Immutable security ledger</h2>
        <div role="group" aria-label="Audit category filters" className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              variant={
                tab.category === category || (tab.category === "ROLE_GOVERNANCE" && governance)
                  ? "primary"
                  : "secondary"
              }
              aria-pressed={
                tab.category === category || (tab.category === "ROLE_GOVERNANCE" && governance)
              }
              onClick={() => setCategory(tab.category)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="field">
            Audit severity
            <select
              aria-label="Audit severity"
              className="control"
              value={severity}
              onChange={(event) =>
                setSeverity(AuditSeverityValues.find((value) => value === event.target.value) ?? "")
              }
            >
              <option value="">All severities</option>
              {AuditSeverityValues.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {governance && (
            <label className="field">
              Governance category
              <select
                aria-label="Governance category"
                className="control"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value === "TOURNAMENT_MODERATION"
                      ? "TOURNAMENT_MODERATION"
                      : "ROLE_GOVERNANCE",
                  )
                }
              >
                <option value="ROLE_GOVERNANCE">Role governance</option>
                <option value="TOURNAMENT_MODERATION">Tournament moderation</option>
              </select>
            </label>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Persisted append-only events. Original IDs and timestamps are retained; this console has
          no edit or deletion actions. Successful system events remain distinct from rejected
          security events.
        </p>
      </Card>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !rows.length ? (
        <EmptyState>No security events match these filters.</EmptyState>
      ) : (
        <Card>
          <Table>
            <caption className="sr-only">Immutable platform security events</caption>
            <thead>
              <tr>
                <th>Record / timestamp</th>
                <th>Category / severity</th>
                <th>Summary</th>
                <th>Actor / target</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id}>
                  <td className="max-w-52 break-all">
                    {event.id}
                    <p className="mt-2 text-xs">{new Date(event.createdAt).toLocaleString()}</p>
                  </td>
                  <td>
                    {event.category}
                    <p className="mt-2">
                      <Badge
                        className={
                          event.severity === "CRITICAL"
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : event.severity === "WARNING"
                              ? "border-primary"
                              : ""
                        }
                      >
                        {event.severity}
                      </Badge>
                    </p>
                  </td>
                  <td className="max-w-xs break-words">{event.summary}</td>
                  <td className="max-w-52 break-all">
                    <p>Actor: {event.actorUserId ?? "Unattributed / system"}</p>
                    <p className="mt-2">Target: {event.targetId ?? "No target"}</p>
                  </td>
                  <td>
                    <AuditMetadataDrawer event={event} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <LoadMore
            hasNext={query.hasNextPage}
            loading={query.isFetchingNextPage}
            load={() => {
              void query.fetchNextPage();
            }}
          />
        </Card>
      )}
    </div>
  );
}
