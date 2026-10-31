import { z } from "zod";
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
