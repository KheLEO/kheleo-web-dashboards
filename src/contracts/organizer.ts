import { z } from "zod";
import { cursorPageSchema, dateSchema, jsonSchema, uuidSchema } from "./common";
export const competitionConfigSchema = z
  .object({
    roleQuotas: z
      .record(z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/), z.number().int().min(0).max(30))
      .optional(),
    prizeBreakdown: z
      .object({
        first: z.number().finite().nonnegative(),
        second: z.number().finite().nonnegative(),
        third: z.number().finite().nonnegative(),
      })
      .strict()
      .optional(),
  })
  .catchall(z.unknown());
export type CompetitionConfig = z.infer<typeof competitionConfigSchema>;
export const organizerSummarySchema = z.object({
  activeTournamentsCount: z.number().int().nonnegative(),
  totalRegisteredAthletes: z.number().int().nonnegative(),
  totalPrizePoolInr: z.number().nonnegative(),
  freeAgentTeamsFormed: z.number().int().nonnegative(),
  activeSafetyAlertsCount: z.number().int().nonnegative(),
});
export const rosterAthleteSchema = z.object({
  userId: uuidSchema,
  name: z.string(),
  gti: z.number().nullable(),
  identityStatus: z.string(),
  isActive: z.boolean(),
  role: z.string(),
});
export const organizerRegistrationSchema = z.object({
  id: uuidSchema,
  status: z.string(),
  registeredAt: dateSchema,
  teamId: uuidSchema.nullable(),
  teamName: z.string().nullable(),
  athletes: z.array(rosterAthleteSchema),
});
export const organizerPoolEntrySchema = rosterAthleteSchema.extend({
  id: uuidSchema,
  primaryRole: z.string(),
  secondaryRole: z.string().nullable(),
  status: z.string(),
  joinedAt: dateSchema,
});
export const sandbaggingLogSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  action: z.literal("SANDBAGGING_DETECTED"),
  metadata: jsonSchema.nullable(),
  createdAt: dateSchema,
});
export const recordMatchResultSchema = z
  .object({
    matchName: z.string().trim().min(3).max(150),
    winnerAthleteIds: z.array(uuidSchema).min(1).max(30),
    loserAthleteIds: z.array(uuidSchema).min(1).max(30),
    scoreSummary: z.record(z.string(), z.unknown()),
    matchId: uuidSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      new Set([...value.winnerAthleteIds, ...value.loserAthleteIds]).size ===
      value.winnerAthleteIds.length + value.loserAthleteIds.length,
    {
      message: "Athlete IDs must be unique and winner/loser lists must be disjoint",
      path: ["loserAthleteIds"],
    },
  );
export const matchResultSchema = z.object({
  id: uuidSchema,
  bracketId: uuidSchema,
  matchId: uuidSchema.nullable(),
  matchName: z.string(),
  scoreSummary: jsonSchema,
  participantAthleteIds: z.array(uuidSchema),
  winnerAthleteIds: z.array(uuidSchema),
  createdAt: dateSchema,
});
export const registrationsPageSchema = cursorPageSchema(organizerRegistrationSchema);
export const poolPageSchema = cursorPageSchema(organizerPoolEntrySchema);
export const sandbaggingPageSchema = cursorPageSchema(sandbaggingLogSchema);
export type OrganizerSummary = z.infer<typeof organizerSummarySchema>;
