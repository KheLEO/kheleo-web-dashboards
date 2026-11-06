import { describe, expect, it } from "vitest";
import { districtSchema, type DistrictHeatmapRecord } from "@/contracts/regional";
import {
  createPolicyReport,
  policyCsv,
  regionalPoints,
  sortDistricts,
} from "@/features/regional/policy-report";
const district: DistrictHeatmapRecord = {
  state: "Uttar Pradesh",
  district: "Ghaziabad",
  total_athletes: 100,
  average_gti: 85,
  female_participation_pct: 24.9,
  centroid: { type: "Point", coordinates: [77.4538, 28.6692] },
};
describe("policy aggregate reports", () => {
  it("scales bubbles by participation while changing the analytical color and value", () => {
    const equity = regionalPoints(
      [district, { ...district, district: "At target", female_participation_pct: 25 }],
      "equity",
      25,
    );
    expect(equity[0]).toMatchObject({
      lat: 28.6692,
      lng: 77.4538,
      value: 24.9,
      radiusValue: 100,
      colorToken: "chart-critical",
    });
    expect(equity[1]?.colorToken).toBe("chart-equity");
    expect(regionalPoints([district], "gti", 25)[0]?.colorToken).toBe("chart-gti");
    expect(regionalPoints([{ ...district, average_gti: 84.9 }], "gti", 25)[0]?.colorToken).toBe(
      "chart-equity",
    );
  });
  it("retains unlocated districts in exports while excluding invalid map coordinates", () => {
    const rows = [
      district,
      { ...district, district: "Unlocated", centroid: null },
      { ...district, district: "Malformed", centroid: { type: "Point", coordinates: [200, 40] } },
    ];
    expect(regionalPoints(rows, "participation", 25)).toHaveLength(1);
    const report = createPolicyReport(
      { success: true, is_complete: true, count: 3, data: rows },
      rows,
      25,
      "2026-10-31T12:00:00.000Z",
    );
    expect(report.districts).toHaveLength(3);
    expect(report.districts[1]?.latitude).toBeNull();
    expect(report.metadata.completeness).toBe("complete");
    expect(report.districts[0]?.below_planning_target).toBe(true);
  });
  it("bounds exported rows and preserves the backend count independently", () => {
    const rows = Array.from({ length: 510 }, (_, index) => ({
      ...district,
      district: String(index),
    }));
    const report = createPolicyReport(
      { success: true, is_complete: true, count: 999, data: rows },
      rows,
      25,
      "now",
    );
    expect(report.districts).toHaveLength(500);
    expect(report.metadata).toMatchObject({
      backend_count: 999,
      received_districts: 510,
      exported_districts: 500,
    });
  });
  it("sorts without mutating rows and uses district names for ties", () => {
    const rows = [
      { ...district, district: "B" },
      { ...district, district: "A", average_gti: 90 },
    ];
    expect(sortDistricts(rows, "average_gti", true).map((row) => row.district)).toEqual(["B", "A"]);
    expect(sortDistricts(rows, "district", true).map((row) => row.district)).toEqual(["A", "B"]);
    expect(rows[0]?.district).toBe("B");
  });
  it("escapes CSV quotes, delimiters and spreadsheet formula prefixes", () => {
    const rows = [district, { ...district, district: ' =HYPERLINK("bad"),\nrow' }];
    const report = createPolicyReport(
      { success: true, is_complete: true, count: 2, data: rows },
      rows,
      25,
      "now",
    );
    const csv = policyCsv(report);
    expect(csv).toContain('"\' =HYPERLINK(""bad""),\nrow"');
    expect(csv).toContain('"complete"');
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("rejects impossible counts, percentages and GTI without misclassifying zero", () => {
    expect(districtSchema.safeParse({ ...district, total_athletes: -1 }).success).toBe(false);
    expect(districtSchema.safeParse({ ...district, female_participation_pct: 101 }).success).toBe(
      false,
    );
    expect(districtSchema.safeParse({ ...district, average_gti: Infinity }).success).toBe(false);
    expect(
      districtSchema.safeParse({
        ...district,
        total_athletes: 0,
        female_participation_pct: 0,
        average_gti: 0,
      }).success,
    ).toBe(true);
  });
});
