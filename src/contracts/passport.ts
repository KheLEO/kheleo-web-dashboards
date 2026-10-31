import { z } from "zod";
import { initialProfileSchema } from "./auth";
import {
  SportTypeValues,
  TierClassificationValues,
  VerificationStatusValues,
} from "./enums.generated";
import { dateSchema, jsonObjectSchema, jsonSchema, uuidSchema } from "./common";
export const createPassportSchema = initialProfileSchema.extend({
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  isScoutSearchable: z.boolean().optional(),
});
export const updatePassportSchema = createPassportSchema
  .omit({ dateOfBirth: true, gender: true })
  .partial();
export const sportInputSchema = z
  .object({
    sport: z.enum(SportTypeValues),
    primaryRole: z.string().min(1).max(50),
    secondaryRoles: z.array(z.string()).optional(),
    verifiedMetrics: jsonObjectSchema.optional(),
    earnedBadges: z.array(jsonObjectSchema).optional(),
  })
  .strict();
export const sportSummarySchema = z.object({
  id: uuidSchema,
  sport: z.enum(SportTypeValues),
  primaryRole: z.string(),
  secondaryRoles: z.array(z.string()),
  totalMatches: z.number(),
  winCount: z.number(),
  winStreak: z.number(),
  verifiedMetrics: jsonObjectSchema,
  earnedBadges: z.array(jsonObjectSchema),
  updatedAt: dateSchema,
});
export const sportRecordSchema = sportSummarySchema.extend({
  athleteId: uuidSchema,
  verifiedMetrics: jsonSchema,
  earnedBadges: jsonSchema,
});
export const passportSchema = z.object({
  userId: uuidSchema,
  athleteProfileId: uuidSchema,
  dateOfBirth: dateSchema,
  gender: z.string(),
  primarySport: z.enum(SportTypeValues),
  secondarySports: z.array(z.enum(SportTypeValues)),
  district: z.string(),
  state: z.string(),
  tierClassification: z.enum(TierClassificationValues),
  physicalStats: z.object({
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    dominantSide: z.string().nullable(),
  }),
  currentGti: z.number(),
  wearableScore: z.number(),
  matchPerfScore: z.number(),
  posturePoints: z.number(),
  identityStatus: z.enum(VerificationStatusValues),
  sportRecords: z.array(sportSummarySchema),
  allBadges: z.array(jsonObjectSchema),
});
export type AthletePassport = z.infer<typeof passportSchema>;
export type CreatePassportRequest = z.infer<typeof createPassportSchema>;
export type UpdatePassportRequest = z.infer<typeof updatePassportSchema>;
export type AddSportRecordRequest = z.infer<typeof sportInputSchema>;
export type SportRecordSummary = z.infer<typeof sportSummarySchema>;
