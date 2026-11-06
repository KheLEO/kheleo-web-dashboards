"use client";
import { Table } from "@/components/ui/table";
import type { DistrictHeatmapRecord } from "@/contracts/regional";
import { parseCentroid } from "./centroid-parser";
import type { RegionalSort } from "./policy-report";
export interface RegionalTableProps {
  districts: readonly DistrictHeatmapRecord[];
  sort: RegionalSort;
  ascending: boolean;
  target: number;
  onSort: (value: RegionalSort) => void;
  onDirection: (value: boolean) => void;
}
export function RegionalTable({
  districts,
  sort,
  ascending,
  target,
  onSort,
  onDirection,
}: RegionalTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="field max-w-xs">
          Sort districts
          <select
            aria-label="Sort districts"
            className="control"
            value={sort}
            onChange={(event) => onSort(event.target.value as RegionalSort)}
          >
            <option value="state">State name</option>
            <option value="district">District name</option>
            <option value="total_athletes">Participation</option>
            <option value="average_gti">Average GTI</option>
            <option value="female_participation_pct">Female participation</option>
          </select>
        </label>
        <label className="field max-w-xs">
          Sort direction
          <select
            aria-label="Sort direction"
            className="control"
            value={ascending ? "ascending" : "descending"}
            onChange={(event) => onDirection(event.target.value === "ascending")}
          >
            <option value="descending">Descending</option>
            <option value="ascending">Ascending</option>
          </select>
        </label>
      </div>
      <Table>
        <caption className="sr-only">Regional participation and gender-equity summary</caption>
        <thead>
          <tr>
            <th scope="col">State</th>
            <th scope="col">District</th>
            <th scope="col">Athletes</th>
            <th scope="col">Average GTI</th>
            <th scope="col">Female participation</th>
            <th scope="col">Planning flag</th>
            <th scope="col">Map location</th>
          </tr>
        </thead>
        <tbody>
          {districts.map((district) => (
            <tr key={JSON.stringify([district.state, district.district])}>
              <td>{district.state}</td>
              <td>{district.district}</td>
              <td className="tabular-nums">{district.total_athletes}</td>
              <td className="tabular-nums text-primary">{district.average_gti.toFixed(1)}</td>
              <td className="tabular-nums">{district.female_participation_pct.toFixed(1)}%</td>
              <td>
                {district.female_participation_pct < target ? (
                  <span className="inline-block rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground">
                    Below {target}% target
                  </span>
                ) : (
                  "At or above target"
                )}
              </td>
              <td>
                {parseCentroid(district.centroid) ? "Centroid available" : "No centroid recorded"}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
