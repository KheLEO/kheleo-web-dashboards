"use client";
import { useState } from "react";
import { Table } from "@/components/ui/table";
import type { DistrictHeatmapRecord } from "@/contracts/regional";
export function RegionalTable({ districts }: { districts: DistrictHeatmapRecord[] }) {
  const [sort, setSort] = useState<"total_athletes" | "average_gti" | "female_participation_pct">(
    "total_athletes",
  );
  return (
    <div className="space-y-4">
      <label className="field max-w-xs">
        Sort districts
        <select
          className="control"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
        >
          <option value="total_athletes">Participation</option>
          <option value="average_gti">Average GTI</option>
          <option value="female_participation_pct">Female participation</option>
        </select>
      </label>
      <Table>
        <caption className="sr-only">Regional participation and gender-equity summary</caption>
        <thead>
          <tr>
            <th>District</th>
            <th>Athletes</th>
            <th>Average GTI</th>
            <th>Female participation</th>
          </tr>
        </thead>
        <tbody>
          {[...districts]
            .sort((a, b) => b[sort] - a[sort])
            .slice(0, 500)
            .map((district) => (
              <tr key={district.district}>
                <td>{district.district}</td>
                <td className="tabular-nums">{district.total_athletes}</td>
                <td className="tabular-nums text-primary">{district.average_gti.toFixed(1)}</td>
                <td className="tabular-nums">{district.female_participation_pct.toFixed(1)}%</td>
              </tr>
            ))}
        </tbody>
      </Table>
    </div>
  );
}
