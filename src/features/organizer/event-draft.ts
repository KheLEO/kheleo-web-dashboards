import { z } from "zod";
import { createTournamentSchema, type CreateTournamentRequest } from "@/contracts/tournaments";
const shape = createTournamentSchema.shape;
export const eventSteps = ["Event details", "Venue", "Capacity & prize", "Review"] as const;
const metadata = z
  .object({
    name: shape.name,
    sport: shape.sport,
    registrationDeadline: shape.registrationDeadline,
    startDate: shape.startDate,
    endDate: shape.endDate,
  })
  .refine(
    (value) =>
      Date.parse(value.registrationDeadline) <= Date.parse(value.startDate) &&
      Date.parse(value.startDate) <= Date.parse(value.endDate),
    { message: "Registration deadline, start, and end must be chronological", path: ["endDate"] },
  );
const venue = z.object({
  venueName: shape.venueName,
  venueLat: shape.venueLat,
  venueLng: shape.venueLng,
});
const capacity = z
  .object({
    minGti: shape.minGti,
    maxGti: shape.maxGti,
    maxTeams: shape.maxTeams,
    teamSize: shape.teamSize,
    prizePool: shape.prizePool,
  })
  .refine((value) => (value.minGti ?? 0) <= (value.maxGti ?? 100), {
    message: "Minimum GTI cannot exceed maximum",
    path: ["maxGti"],
  });
export function serializeEventDraft(draft: CreateTournamentRequest): CreateTournamentRequest {
  const iso = (value: string): string =>
    Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : value;
  return {
    ...draft,
    registrationDeadline: iso(draft.registrationDeadline),
    startDate: iso(draft.startDate),
    endDate: iso(draft.endDate),
  };
}
export function validateEventStep(draft: CreateTournamentRequest, step: number): string | null {
  const schemas = [metadata, venue, capacity, createTournamentSchema];
  const result = (schemas[step] ?? createTournamentSchema).safeParse(serializeEventDraft(draft));
  return result.success
    ? null
    : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" · ");
}
