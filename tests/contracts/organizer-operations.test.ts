import { expect, it } from "vitest";
import {
  createTournamentSchema,
  updateTournamentSchema,
  createBracketSchema,
} from "@/contracts/tournaments";
import { recordMatchResultSchema } from "@/contracts/organizer";
import { acknowledgeSafetySchema, resumeSafetySchema } from "@/contracts/safety";
import { withGtiAliases } from "@/server/api/gti-aliases";
import { ids, makeTournament } from "@/test/factories";
const event = makeTournament();
const write = {
  name: event.name,
  sport: event.sport,
  maxTeams: event.maxTeams,
  teamSize: event.teamSize,
  prizePool: Number(event.prizePool),
  venueName: event.venueName,
  venueLat: event.venueLat,
  venueLng: event.venueLng,
  registrationDeadline: event.registrationDeadline,
  startDate: event.startDate,
  endDate: event.endDate,
};
it("validates quota totals and prize budgets before an event can be saved", () => {
  expect(
    createTournamentSchema.safeParse({
      ...write,
      rulesConfig: {
        roleQuotas: { BOWLER: 11 },
        prizeBreakdown: { first: 10000, second: 5000, third: 2000 },
      },
    }).success,
  ).toBe(true);
  expect(
    createTournamentSchema.safeParse({ ...write, rulesConfig: { roleQuotas: { BOWLER: 2 } } })
      .success,
  ).toBe(false);
  expect(
    createTournamentSchema.safeParse({
      ...write,
      rulesConfig: { prizeBreakdown: { first: 25001, second: 0, third: 0 } },
    }).success,
  ).toBe(false);
  expect(
    createBracketSchema.safeParse({
      name: "Bowlers",
      tierName: "OPEN",
      minGti: 0,
      maxGti: 100,
      config: { roleQuotas: { BOWLER: -1 } },
    }).success,
  ).toBe(false);
});
it("accepts GTI aliases while rejecting contradictory and privileged event fields", () => {
  const schema = withGtiAliases(updateTournamentSchema);
  expect(schema.parse({ min_gti: 20, max_gti: 80 })).toEqual({ minGti: 20, maxGti: 80 });
  expect(schema.safeParse({ min_gti: 20, minGti: 30 }).success).toBe(false);
  expect(schema.safeParse({ organizerId: ids.athlete }).success).toBe(false);
});
it("requires disjoint winner/loser identities and explicit medical confirmation", () => {
  const body = {
    matchName: "Campus final",
    winnerAthleteIds: [ids.athlete],
    loserAthleteIds: [ids.organizer],
    scoreSummary: { result: "2-1" },
  };
  expect(recordMatchResultSchema.safeParse(body).success).toBe(true);
  expect(
    recordMatchResultSchema.safeParse({ ...body, loserAthleteIds: [ids.athlete] }).success,
  ).toBe(false);
  expect(
    acknowledgeSafetySchema.safeParse({
      medicalCheckNote: "Medical check requested",
      medicalCheckDispatched: false,
    }).success,
  ).toBe(false);
  expect(
    resumeSafetySchema.safeParse({
      medicalClearanceNote: "Cleared by field staff",
      medicalClearanceConfirmed: false,
    }).success,
  ).toBe(false);
});
