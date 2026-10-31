import type { DistrictHeatmapRecord, RegionalHeatmapResponse } from "@/contracts/regional";
import type { MapPoint } from "@/lib/maps/leaflet-map.client";
import { parseCentroid } from "./centroid-parser";
export type RegionalMetric = "gti" | "participation" | "equity";
export type RegionalSort =
  "district" | "total_athletes" | "average_gti" | "female_participation_pct";
export const regionalRenderLimit = 500;
export function sortDistricts(
  rows: readonly DistrictHeatmapRecord[],
  sort: RegionalSort,
  ascending: boolean,
): DistrictHeatmapRecord[] {
  return [...rows].sort((a, b) => {
    const difference =
      sort === "district" ? a.district.localeCompare(b.district, "en") : a[sort] - b[sort];
    return (difference || a.district.localeCompare(b.district, "en")) * (ascending ? 1 : -1);
  });
}
export function regionalPoints(
  rows: readonly DistrictHeatmapRecord[],
  metric: RegionalMetric,
  target: number,
): MapPoint[] {
  return rows.flatMap((district, index) => {
    const center = parseCentroid(district.centroid);
    if (!center) return [];
    const value =
      metric === "gti"
        ? district.average_gti
        : metric === "equity"
          ? district.female_participation_pct
          : district.total_athletes;
    return [
      {
        id: `${district.district}:${index}`,
        lat: center[0],
        lng: center[1],
        label: district.district,
        value,
        radiusValue: district.total_athletes,
        colorToken:
          metric === "equity" && value < target
            ? "chart-critical"
            : metric === "gti" && value < 85
              ? "chart-equity"
              : `chart-${metric}`,
        detail: `${district.total_athletes} athletes · average GTI ${district.average_gti.toFixed(1)} · female participation ${district.female_participation_pct.toFixed(1)}%${district.female_participation_pct < target ? ` · below ${target}% planning target` : ""}`,
      },
    ];
  });
}
export function createPolicyReport(
  response: RegionalHeatmapResponse,
  rows: readonly DistrictHeatmapRecord[],
  target: number,
  generatedAt: string,
) {
  const selected = rows.slice(0, regionalRenderLimit);
  return {
    metadata: {
      title: "KheLEO regional policy report",
      generated_at: generatedAt,
      backend_count: response.count,
      received_districts: response.data.length,
      exported_districts: selected.length,
      render_limit: regionalRenderLimit,
      female_participation_planning_target: target,
      completeness: "unknown",
      notes:
        "Returned aggregates only; backend completeness, state disambiguation, rural classification and academy infrastructure are unavailable. Planning targets do not establish a funding decision.",
    },
    districts: selected.map((district) => {
      const center = parseCentroid(district.centroid);
      return {
        district: district.district,
        total_athletes: district.total_athletes,
        average_gti: district.average_gti,
        female_participation_pct: district.female_participation_pct,
        below_planning_target: district.female_participation_pct < target,
        latitude: center?.[0] ?? null,
        longitude: center?.[1] ?? null,
      };
    }),
  };
}
export type PolicyReport = ReturnType<typeof createPolicyReport>;
function csvCell(value: string | number | boolean | null): string {
  const raw = value === null ? "" : String(value);
  const safe = typeof value === "string" && /^\s*[=+@\-\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function policyCsv(report: PolicyReport): string {
  const header = [
    "district",
    "total_athletes",
    "average_gti",
    "female_participation_pct",
    "below_planning_target",
    "latitude",
    "longitude",
    "planning_target_pct",
    "completeness",
    "generated_at",
  ];
  return [
    header.map(csvCell).join(","),
    ...report.districts.map((row) =>
      [
        row.district,
        row.total_athletes,
        row.average_gti,
        row.female_participation_pct,
        row.below_planning_target,
        row.latitude,
        row.longitude,
        report.metadata.female_participation_planning_target,
        report.metadata.completeness,
        report.metadata.generated_at,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}
export function downloadPolicyReport(report: PolicyReport, format: "csv" | "json"): void {
  const blob = new Blob(
    [format === "csv" ? `\uFEFF${policyCsv(report)}` : JSON.stringify(report, null, 2)],
    { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = `kheleo-regional-policy.${format}`;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
