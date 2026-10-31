"use client";
import { useState } from "react";
import { MapLoader } from "@/lib/maps/map-loader";
import { ErrorState, EmptyState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegional } from "./queries";
import { parseCentroid } from "./centroid-parser";
import { RegionalTable } from "./regional-table";
export function RegionalInsights() {
  const query = useRegional();
  const [metric, setMetric] = useState<"gti" | "participation" | "equity">("participation");
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
  if (!query.data.data.length)
    return <EmptyState>No regional participation data is available.</EmptyState>;
  const points = query.data.data.slice(0, 500).flatMap((district) => {
    const center = parseCentroid(district.centroid);
    if (!center) return [];
    return [
      {
        id: district.district,
        lat: center[0],
        lng: center[1],
        label: district.district,
        value:
          metric === "gti"
            ? district.average_gti
            : metric === "equity"
              ? district.female_participation_pct
              : district.total_athletes,
      },
    ];
  });
  return (
    <div className="space-y-6">
      <label className="field max-w-sm">
        Map metric
        <select
          className="control"
          value={metric}
          onChange={(event) => setMetric(event.target.value as typeof metric)}
        >
          <option value="participation">Athlete participation</option>
          <option value="gti">Average GTI</option>
          <option value="equity">Female participation (%)</option>
        </select>
      </label>
      <MapLoader
        center={points[0] ? [points[0].lat, points[0].lng] : [22.5, 79]}
        points={points}
        metric={metric}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        District centroid circles, not district boundaries. Showing up to 500 returned districts;
        the platform does not yet report aggregate completeness. Districts without valid coordinates
        remain in the table.
      </p>
      <RegionalTable districts={query.data.data} />
    </div>
  );
}
