"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { LoadMore } from "@/components/shared/cursor-list";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { sportInputSchema } from "@/contracts/passport";
import { SportTypeValues } from "@/contracts/enums.generated";
import { useSession } from "@/features/auth/session-provider";
import { useSports } from "./queries";
import { saveSport } from "./api";
export function SportRecords() {
  const query = useSports();
  const { user } = useSession();
  const client = useQueryClient();
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Add or update a sport</h2>
        <SchemaForm
          schema={sportInputSchema}
          fields={[
            {
              name: "sport",
              label: "Sport",
              type: "select",
              options: SportTypeValues,
              required: true,
            },
            { name: "primaryRole", label: "Primary role", required: true },
            {
              name: "secondaryRoles",
              label: "Secondary roles",
              valueType: "list",
              hint: "Comma-separated role names.",
            },
          ]}
          submitLabel="Save sport record"
          submit={(_value, operation) => saveSport(user.id, operation)}
          onSuccess={() => {
            void client.invalidateQueries({ queryKey: ["sports", user.id] });
            void client.invalidateQueries({ queryKey: ["passport", user.id] });
          }}
        />
      </Card>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          {query.data.pages.flatMap((page) => page.data).length === 0 && (
            <EmptyState>No sport records yet.</EmptyState>
          )}
          {query.data.pages
            .flatMap((page) => page.data)
            .map((record) => (
              <Card key={record.id}>
                <h2 className="font-semibold">{record.sport}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {record.primaryRole} · {record.totalMatches} matches · {record.winCount} wins
                </p>
              </Card>
            ))}
          <LoadMore
            hasNext={query.hasNextPage}
            loading={query.isFetchingNextPage}
            load={() => {
              void query.fetchNextPage();
            }}
          />
        </>
      )}
    </div>
  );
}
