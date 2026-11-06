import { z } from "zod";
import { SportTypeValues } from "./enums.generated";
import { uuidSchema } from "./common";
export const rankSchema = z.object({
  sport: z.string(),
  athleteId: uuidSchema,
  rank: z.number().nullable(),
});
export const gtiSchema = z.object({
  athleteId: uuidSchema,
  gti: z.number(),
  previousGti: z.number(),
  biomechanicalScore: z.number(),
  wearableScore: z.number(),
  matchPerformanceScore: z.number(),
  eliteBreached: z.boolean(),
  scoutAlertTriggered: z.boolean(),
});
export type RankResponse = z.infer<typeof rankSchema>;
export type GtiComputationResult = z.infer<typeof gtiSchema>;
export const leaderboardQuerySchema = z
  .object({
    scope: z.enum(["NATIONAL", "STATE", "DISTRICT"]).default("NATIONAL"),
    sport: z.enum(["ALL", ...SportTypeValues]).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    district: z.string().trim().min(1).max(100).optional(),
    tier: z.enum(["ALL", "RURAL_AND_TIER_2_3"]).optional(),
    gender: z.string().trim().min(1).max(16).optional(),
    cursor_id: uuidSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((value) => value.scope === "NATIONAL" || Boolean(value.state), {
    message: "Choose a state for this scope",
    path: ["state"],
  })
  .refine((value) => value.scope !== "DISTRICT" || Boolean(value.district), {
    message: "Choose a district",
    path: ["district"],
  });
export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  athlete_id: uuidSchema,
  profile_id: uuidSchema,
  display_name: z.string(),
  district: z.string(),
  state: z.string(),
  tier_classification: z.string(),
  gender: z.string().nullable(),
  primary_sport: z.enum(SportTypeValues),
  primary_role: z.string().nullable(),
  gti: z.number().min(0).max(100),
  biomechanical_score: z.number(),
  wearable_consistency_score: z.number(),
  match_performance_score: z.number(),
  win_rate: z.number().min(0).max(100),
  total_matches: z.number().int().nonnegative(),
});
export const leaderboardPageSchema = z.object({
  success: z.literal(true),
  scope: z.enum(["NATIONAL", "STATE", "DISTRICT"]),
  total: z.number().int().nonnegative(),
  next_cursor: uuidSchema.nullable(),
  has_more: z.boolean(),
  data: z.array(leaderboardEntrySchema),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
