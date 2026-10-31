import { describe, expect, it } from "vitest";
import {
  createTournamentSchema,
  createBracketSchema,
  bracketSchema,
} from "@/contracts/tournaments";
import { problemSchema } from "@/contracts/common";
import { EventDeduplicator } from "@/lib/realtime/event-deduplication";
import { makeBracket, makeTournament } from "@/test/factories";
describe("competition contracts", () => {
  it("preserves Prisma Decimal wire strings", () => {
    expect(bracketSchema.parse(makeBracket()).entryFee).toBe("500");
    expect(bracketSchema.safeParse({ ...makeBracket(), entryFee: 500 }).success).toBe(false);
  });
  it("validates bracket floor/ceiling and fee", () => {
    expect(
      createBracketSchema.safeParse({ name: "Gold", tierName: "GOLD", minGti: 80, maxGti: 60 })
        .success,
    ).toBe(false);
    expect(
      createBracketSchema.safeParse({
        name: "Gold",
        tierName: "GOLD",
        minGti: 60,
        maxGti: 80,
        entryFee: -1,
      }).success,
    ).toBe(false);
  });
  it("rejects extra tournament fields and invalid chronology", () => {
    const tour = makeTournament();
    const dto = {
      name: tour.name,
      sport: tour.sport,
      maxTeams: tour.maxTeams,
      teamSize: tour.teamSize,
      venueName: tour.venueName,
      venueLat: tour.venueLat,
      venueLng: tour.venueLng,
      registrationDeadline: tour.registrationDeadline,
      startDate: tour.startDate,
      endDate: tour.endDate,
    };
    expect(createTournamentSchema.safeParse(dto).success).toBe(true);
    expect(
      createTournamentSchema.safeParse({ ...dto, organizerId: tour.organizerId }).success,
    ).toBe(false);
    expect(
      createTournamentSchema.safeParse({ ...dto, endDate: "2020-01-01T00:00:00.000Z" }).success,
    ).toBe(false);
  });
  it("preserves nullable suggestions in anti-sandbagging problems", () => {
    expect(
      problemSchema.parse({
        type: "about:blank",
        title: "Conflict",
        status: 409,
        detail: "Wrong tier",
        instance: "/register",
        timestamp: "now",
        code: "SANDBAGGING_DETECTED",
        suggestedBracketId: null,
      }).suggestedBracketId,
    ).toBeNull();
  });
  it("deduplicates repeated events with bounded time and capacity", () => {
    const seen = new EventDeduplicator(100, 2);
    expect(seen.accept("team", 0)).toBe(true);
    expect(seen.accept("team", 1)).toBe(false);
    expect(seen.accept("other", 2)).toBe(true);
    expect(seen.accept("third", 3)).toBe(true);
    expect(seen.accept("team", 4)).toBe(true);
    expect(seen.accept("team", 105)).toBe(true);
  });
});
