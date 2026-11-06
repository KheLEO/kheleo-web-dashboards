"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TournamentStatusValues, type TournamentStatus } from "@/contracts/enums.generated";
import { moderationSchema } from "@/contracts/admin";
import { useSession } from "@/features/auth/session-provider";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { useAdminTournaments } from "./queries";
import { moderateTournament } from "./api";
interface ModerationOperation {
  id: string;
  operation: MutationOperation;
}
export function TournamentModeration() {
  const { user } = useSession();
  const client = useQueryClient();
  const [status, setStatus] = useState<TournamentStatus | "">("");
  const [validation, setValidation] = useState<string | null>(null);
  const query = useAdminTournaments(status ? { status } : {});
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const operations = useRef(new Map<string, MutationOperation>());
  const flight = useRef(false);
  const mutation = useMutation({
    mutationFn: (action: ModerationOperation) => moderateTournament(action.id, action.operation),
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      for (const key of [
        "admin-tournaments",
        "admin-dashboard",
        "admin-audit",
        "owned-tournaments",
      ])
        void client.invalidateQueries({ queryKey: [key, user.id] });
    },
  });
  function send(id: string, body: unknown): void {
    if (flight.current) return;
    const parsed = moderationSchema.safeParse(body);
    if (!parsed.success) {
      setValidation(parsed.error.issues.map((issue) => issue.message).join(" · "));
      return;
    }
    setValidation(null);
    flight.current = true;
    const operation = sameOperation(operations.current.get(id) ?? null, parsed.data);
    operations.current.set(id, operation);
    mutation.mutate({ id, operation });
  }
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Global tournament moderation</h2>
      <label className="field mb-5 max-w-md">
        Tournament status filter
        <select
          aria-label="Tournament status filter"
          className="control"
          value={status}
          onChange={(event) =>
            setStatus(TournamentStatusValues.find((value) => value === event.target.value) ?? "")
          }
        >
          <option value="">All statuses</option>
          {TournamentStatusValues.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {validation && <p role="alert">{validation}</p>}
      {mutation.error && <ErrorState error={mutation.error} />}{" "}
      {mutation.data && (
        <p role="status" className="my-4">
          Tournament moderation recorded.
        </p>
      )}
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
        <EmptyState>No tournaments match this status.</EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Platform-wide tournament moderation</caption>
          <thead>
            <tr>
              <th>Event / organizer</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Moderation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id}>
                <td>
                  {event.name || event.title}
                  <p className="mt-2 break-all text-xs">{event.id}</p>
                  <p className="mt-2 break-all text-xs">Organizer: {event.organizerId}</p>
                </td>
                <td>{event.status}</td>
                <td>{event.isFeatured ? "Featured" : "Standard listing"}</td>
                <td>
                  <div className="flex min-w-52 flex-wrap gap-3">
                    <label className="field w-full">
                      Set event status
                      <select
                        aria-label={`Set status for ${event.name}`}
                        className="control"
                        value={event.status}
                        disabled={mutation.isPending}
                        onChange={(change) => {
                          const value = TournamentStatusValues.find(
                            (item) => item === change.target.value,
                          );
                          if (value) send(event.id, { status: value });
                        }}
                      >
                        {TournamentStatusValues.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <Button
                      variant="secondary"
                      disabled={mutation.isPending}
                      onClick={() => send(event.id, { featured: !event.isFeatured })}
                    >
                      {event.isFeatured ? "Remove feature" : "Feature tournament"}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={
                        mutation.isPending ||
                        event.status === "SUSPENDED" ||
                        event.status === "COMPLETED" ||
                        event.status === "CANCELLED"
                      }
                      onClick={() => {
                        if (window.confirm(`Suspend ${event.name}?`))
                          send(event.id, { suspended: true });
                      }}
                    >
                      Suspend tournament
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
    </Card>
  );
}
