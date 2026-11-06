"use client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  const [underrepresented, setUnderrepresented] = useState(false);
  const [filters, setFilters] = useState<ScoutFeedQuery>({ min_gti: 85 });
  const settledFilters = useDebouncedValue(filters, 300);
  const query = useProspects(settledFilters);
  const loaded = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.data) ?? []).map((prospect) => [
        prospect.athlete_id,
        prospect,
      ]),
    ).values(),
  );
  const prospects = underrepresented
    ? loaded.filter((prospect) => prospect.is_rural_or_underrepresented)
    : loaded;
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
              min: 85,
              max: 100,
            },
            { name: "sport", label: "Sport", type: "select", options: SportTypeValues },
            { name: "district", label: "District" },
          ]}
          schema={scoutFeedQuerySchema.extend({
            min_gti: z.coerce.number().min(85).max(100).default(85),
          })}
          defaults={{ min_gti: "85" }}
          submitLabel="Apply talent filters"
          successMessage="Talent filters updated."
          submit={async (value) => {
            setFilters(value);
          }}
        />
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={underrepresented}
            onChange={(event) => setUnderrepresented(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Underrepresented athletes in loaded pages
        </label>
        <Button
          variant="secondary"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          Refresh prospects
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Feed includes all searchable athletes meeting the filters. Rural and underrepresented status
        is labeled individually.
      </p>
      <p className="text-xs text-muted-foreground">
        {prospects.length} shown from {loaded.length} loaded profiles · 20 profiles per page. The
        local underrepresentation filter covers loaded pages only. Results use current GTI and a
        unique profile tie-breaker.
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
        <EmptyState>
          No profiles in the loaded pages match these filters. Load more if available, or adjust the
          search.
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {prospects.map((prospect) => (
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
