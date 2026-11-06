import { describe, expect, it } from "vitest";
import { leaderboardQuerySchema, leaderboardPageSchema } from "@/contracts/gti";
import { outreachSchema, scoutDossierSchema } from "@/contracts/scouting";
import { districtSchema } from "@/contracts/regional";
import { createPolicyReport, regionalPoints } from "@/features/regional/policy-report";
import { ids } from "@/test/factories";
describe("scout intelligence contracts", () => {
  it("validates scoped demographic filters and UUID pagination without accepting privileged fields", () => {
    expect(leaderboardQuerySchema.parse({})).toMatchObject({ scope: "NATIONAL", limit: 20 });
    expect(leaderboardQuerySchema.safeParse({ scope: "STATE" }).success).toBe(false);
    expect(
      leaderboardQuerySchema.safeParse({ scope: "DISTRICT", state: "Maharashtra" }).success,
    ).toBe(false);
    expect(
      leaderboardQuerySchema.parse({
        scope: "DISTRICT",
        state: "Maharashtra",
        district: "Shared",
        sport: "ALL",
        gender: "FEMALE",
        tier: "RURAL_AND_TIER_2_3",
        cursor_id: ids.profile,
      }),
    ).toMatchObject({ limit: 20, cursor_id: ids.profile });
    expect(leaderboardQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(
      leaderboardPageSchema.safeParse({
        success: true,
        scope: "NATIONAL",
        total: 0,
        data: [],
        next_cursor: null,
        has_more: false,
      }).success,
    ).toBe(true);
    expect(outreachSchema.safeParse({ actionType: "SHORTLIST_BOOKMARK" }).success).toBe(true);
    expect(outreachSchema.safeParse({ actionType: "APPROVE_IDENTITY" }).success).toBe(false);
    expect(
      outreachSchema.safeParse({ actionType: "OFFER_TRIAL", scoutId: ids.scout }).success,
    ).toBe(false);
  });
  it("keeps equally named districts distinct in map points and exports and preserves completeness", () => {
    const region = districtSchema.parse({
      state: "Maharashtra",
      district: "Shared",
      total_athletes: 2,
      average_gti: 80,
      female_participation_pct: 50,
      centroid: { type: "Point", coordinates: [73, 18] },
    });
    const rows = [region, { ...region, state: "Karnataka" }];
    const points = regionalPoints(rows, "gti", 25);
    expect(new Set(points.map((point) => point.id)).size).toBe(2);
    expect(points.map((point) => point.label)).toEqual([
      "Shared, Maharashtra",
      "Shared, Karnataka",
    ]);
    const report = createPolicyReport(
      { success: true, count: 2, is_complete: false, data: rows },
      rows,
      25,
      "now",
    );
    expect(report.metadata.completeness).toBe("partial");
    expect(report.districts.map((row) => row.state)).toEqual(["Maharashtra", "Karnataka"]);
  });
  it("requires signed drill evidence fields instead of accepting a basic passport as a dossier", () => {
    expect(
      scoutDossierSchema.safeParse({ athlete_id: ids.athlete, profile_id: ids.profile }).success,
    ).toBe(false);
  });
});
