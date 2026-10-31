"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/features/auth/session-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getUser } from "./api";
import { Card } from "@/components/ui/card";
import { SchemaForm } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
export function UserInspector() {
  const { user } = useSession();
  const [draft, setDraft] = useState("");
  const id = useDebouncedValue(draft, 300);
  const query = useQuery({
    queryKey: ["admin-user", user.id, id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => getUser(id, signal),
  });
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Inspect a known user</h2>
        <SchemaForm
          fields={[{ name: "id", label: "User UUID", required: true }]}
          schema={z.object({ id: z.uuid() })}
          submitLabel="Inspect user"
          successMessage="User lookup requested."
          submit={async (value) => {
            setDraft(value.id);
          }}
        />
      </Card>
      {id &&
        (query.isPending ? (
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
            <h2 className="mb-4 text-lg font-semibold">Account details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Account ID</dt>
                <dd className="break-all">{query.data.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="break-words">
                  {query.data.email ?? query.data.phone ?? "Unavailable"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role / account state</dt>
                <dd>
                  {query.data.role} · {query.data.isActive ? "Active" : "Inactive"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(query.data.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              This projection does not include organizer/scout approval or government verification
              status. Account activity is not proof of credential approval.
            </p>
          </Card>
        ))}
    </div>
  );
}
