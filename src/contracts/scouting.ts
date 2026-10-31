import { z } from "zod";
import { cursorQuerySchema, dateSchema, decimalSchema, uuidSchema } from "./common";
export const scoutFeedQuerySchema = cursorQuerySchema
  .extend({
    min_gti: z.coerce.number().min(0).max(100).optional(),
    sport: z.string().optional(),
    district: z.string().max(100).optional(),
  })
  .strict();
export const prospectSchema = z.object({
  athlete_id: uuidSchema,
  profile_id: uuidSchema,
  gti: z.number(),
  primary_sport: z.string(),
  district: z.string(),
  state: z.string(),
  tier: z.string(),
  is_rural_or_underrepresented: z.boolean(),
  biomechanical_score: z.number(),
  training_consistency_score: z.number(),
  match_performance_score: z.number(),
  posture_points: z.number(),
  alert_count: z.number(),
});
export const scoutFeedSchema = z.object({
  success: z.boolean(),
  total: z.number(),
  limit: z.number(),
  next_cursor: uuidSchema.nullable(),
  data: z.array(prospectSchema),
});
export const scoutAlertSchema = z.object({
  id: uuidSchema,
  athleteId: uuidSchema,
  gtiScore: z.number(),
  district: z.string(),
  sport: z.string(),
  isAcknowledged: z.boolean(),
  createdAt: dateSchema,
});
export const scoutAlertProjectionSchema = scoutAlertSchema.extend({
  athlete: z.object({
    id: uuidSchema,
    email: z.string().nullable(),
    phone: z.string().nullable(),
    athleteProfile: z
      .object({
        id: uuidSchema,
        primarySport: z.string(),
        currentGti: decimalSchema,
        district: z.string(),
        state: z.string(),
      })
      .nullable(),
  }),
});
export type ProspectSummary = z.infer<typeof prospectSchema>;
export type ScoutFeedResponse = z.infer<typeof scoutFeedSchema>;
export type ScoutFeedQuery = z.infer<typeof scoutFeedQuerySchema>;
export type ScoutAlertProjection = z.infer<typeof scoutAlertProjectionSchema>;
