"use client";
import { useState } from "react";
import { MapLoader } from "@/lib/maps/map-loader";
import { ErrorState, EmptyState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useRegional } from "./queries";
import { RegionalTable } from "./regional-table";
import {
  createPolicyReport,
  downloadPolicyReport,
  regionalPoints,
  regionalRenderLimit,
  sortDistricts,
  type RegionalMetric,
  type RegionalSort,
} from "./policy-report";
export function RegionalInsights() {
  const query = useRegional();
  const [metric, setMetric] = useState<RegionalMetric>("participation");
  const [sort, setSort] = useState<RegionalSort>("total_athletes");
  const [ascending, setAscending] = useState(false);
  const [target, setTarget] = useState(25);
  const [exportError, setExportError] = useState<string | null>(null);
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
  const bounded = query.data.data.slice(0, regionalRenderLimit);
  const rows = sortDistricts(bounded, sort, ascending);
  const points = regionalPoints(bounded, metric, target);
  function exportReport(format: "csv" | "json"): void {
    if (!query.data) return;
    try {
      setExportError(null);
      downloadPolicyReport(
        createPolicyReport(query.data, rows, target, new Date().toISOString()),
        format,
      );
    } catch (failure: unknown) {
      setExportError(
        failure instanceof Error
          ? failure.message
          : "Policy report download failed. Try again in a supported browser.",
      );
    }
  }
  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            Map metric
            <select
              aria-label="Map metric"
              className="control"
              value={metric}
              onChange={(event) => setMetric(event.target.value as RegionalMetric)}
            >
              <option value="participation">Athlete participation</option>
              <option value="gti">Average GTI</option>
              <option value="equity">Female participation (%)</option>
            </select>
          </label>
          <label className="field">
            Female participation planning target (%)
            <input
              aria-label="Female participation planning target (%)"
              className="control"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={target}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value) && value >= 0 && value <= 100) setTarget(value);
              }}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => exportReport("csv")}>
            Export policy report (CSV)
          </Button>
          <Button variant="secondary" onClick={() => exportReport("json")}>
            Export policy report (JSON)
          </Button>
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => {
              void query.refetch();
            }}
          >
            Refresh regional data
          </Button>
        </div>
        {exportError && (
          <div className="mt-4">
            <Alert danger>{exportError}</Alert>
          </div>
        )}
      </Card>
      <MapLoader
        center={points[0] ? [points[0].lat, points[0].lng] : [22.5, 79]}
        points={points}
        metric={metric}
      />
      <Card>
        <h2 className="mb-3 font-semibold">Map legend</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Circle size represents athlete participation in every layer.{" "}
          {metric === "equity"
            ? `Crimson circles show female participation below the ${target}% planning target; blue circles meet or exceed it.`
            : metric === "gti"
              ? "Gold circles show an average GTI of 85 or above; blue circles show lower averages."
              : "Silver circles show returned athlete participation totals."}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          District centroid circles do not show district boundaries. {rows.length} displayed of{" "}
          {query.data.data.length} received rows; backend count {query.data.count}. Up to 500 rows
          are rendered and exported. {rows.length - points.length} displayed districts have no
          usable centroid and remain in the table and report. Data completeness:{" "}
          {query.data.is_complete
            ? "complete within the current dataset"
            : "partial (backend limit reached)"}
          . Districts are qualified by state.
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          The planning target is illustrative and adjustable. These aggregates do not report rural
          classification, academy access, causal inequity, or funding eligibility.
        </p>
      </Card>
      <RegionalTable
        districts={rows}
        sort={sort}
        ascending={ascending}
        target={target}
        onSort={setSort}
        onDirection={setAscending}
      />
    </div>
  );
}
