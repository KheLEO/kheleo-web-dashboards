"use client";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useSession } from "@/features/auth/session-provider";
import { useOwnedTournaments } from "./queries";
import { deleteTournament } from "@/features/tournaments/api";
import { createOperation, type MutationOperation } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadMore } from "@/components/shared/cursor-list";
import { formatMoney } from "@/lib/format";
interface DeleteAction {
  id: string;
  operation: MutationOperation;
}
export function OwnedTournaments() {
  const query = useOwnedTournaments();
  const client = useQueryClient();
  const { user } = useSession();
  const operations = useRef(new Map<string, MutationOperation>());
  const deletion = useMutation({
    mutationFn: (action: DeleteAction) => deleteTournament(action.id, action.operation),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["owned-tournaments", user.id] });
      void client.invalidateQueries({ queryKey: ["organizer-summary", user.id] });
    },
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Owned tournaments</h2>
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
        <EmptyState>No tournaments yet. Create your first event.</EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Organizer-owned tournaments and management actions</caption>
          <thead>
            <tr>
              <th>Tournament</th>
              <th>Status</th>
              <th>Configured prize pool</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link className="text-primary" href={`/organizer/tournaments/${event.id}`}>
                    {event.name || event.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {event.sport} · {event.venueName}
                  </p>
                </td>
                <td>{event.status.replaceAll("_", " ")}</td>
                <td>{formatMoney(event.prizePool, event.currency)}</td>
                <td>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      className="text-primary underline"
                      href={`/organizer/tournaments/${event.id}/edit`}
                    >
                      Edit
                    </Link>
                    <Link
                      className="text-primary underline"
                      href={`/organizer/tournaments/${event.id}/brackets`}
                    >
                      Manage Brackets/Rosters
                    </Link>
                    <Link
                      className="text-primary underline"
                      href={`/organizer/tournaments/${event.id}/safety`}
                    >
                      Open Safety Command Center
                    </Link>
                    <Button
                      variant="ghost"
                      disabled={deletion.isPending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete ${event.name}? This removes its brackets and registrations.`,
                          )
                        )
                          return;
                        const operation = operations.current.get(event.id) ?? createOperation({});
                        operations.current.set(event.id, operation);
                        deletion.mutate({ id: event.id, operation });
                      }}
                    >
                      Delete tournament
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {deletion.error && <ErrorState error={deletion.error} />}
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
