"use client";
import { useState } from "react";
import { SchemaForm } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadMore } from "@/components/shared/cursor-list";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { SportTypeValues } from "@/contracts/enums.generated";
import { scoutFeedQuerySchema, type ScoutFeedQuery } from "@/contracts/scouting";
import { useProspects } from "./queries";
import { ProspectCard } from "./prospect-card";
export function ProspectDiscovery() {
  const [filters, setFilters] = useState<ScoutFeedQuery>({ min_gti: 85 });
  const query = useProspects(filters);
  const prospects = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <div className="space-y-6">
      <Card>
        <SchemaForm
          fields={[
            {
              name: "min_gti",
              label: "Minimum GTI",
              type: "number",
              valueType: "number",
              min: 0,
              max: 100,
            },
            { name: "sport", label: "Sport", type: "select", options: SportTypeValues },
            { name: "district", label: "District" },
          ]}
          schema={scoutFeedQuerySchema}
          defaults={{ min_gti: "85" }}
          submitLabel="Apply talent filters"
          successMessage="Talent filters updated."
          submit={async (value) => {
            setFilters(value);
          }}
        />
      </Card>
      <p className="text-xs text-muted-foreground">
        Feed includes all searchable athletes meeting the filters. Rural and underrepresented status
        is labeled individually.
      </p>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : prospects.length === 0 ? (
        <EmptyState>No searchable athletes match these filters.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(
            new Map(prospects.map((prospect) => [prospect.athlete_id, prospect])).values(),
          ).map((prospect) => (
            <ProspectCard key={prospect.athlete_id} prospect={prospect} />
          ))}
        </div>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
    </div>
  );
}
