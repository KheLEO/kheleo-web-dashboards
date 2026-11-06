import { z } from "zod";
import { cursorQuerySchema, dateSchema, decimalSchema, uuidSchema, jsonSchema } from "./common";
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
export const outreachActionValues = [
  "OFFER_TRIAL",
  "SPONSORSHIP_INQUIRY",
  "SHORTLIST_BOOKMARK",
] as const;
export const outreachSchema = z
  .object({
    actionType: z.enum(outreachActionValues),
    notes: z.string().trim().max(4000).optional(),
    organizationName: z.string().trim().max(200).optional(),
  })
  .strict();
export const outreachEventSchema = z.object({
  actionType: z.enum(outreachActionValues),
  notes: z.string(),
  organizationName: z.string().nullable(),
  recordedAt: dateSchema,
});
export const outreachRecordSchema = z.object({
  id: uuidSchema,
  athleteId: uuidSchema,
  scoutId: uuidSchema,
  scoutNotes: z.string(),
  isShortlisted: z.boolean(),
  pipelineStatus: z.string(),
  organizationName: z.string().nullable(),
  outreachHistory: z.array(outreachEventSchema),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export const scoutDossierSchema = z.object({
  athlete_id: uuidSchema,
  profile_id: uuidSchema,
  display_name: z.string(),
  district: z.string(),
  state: z.string(),
  tier_classification: z.string(),
  primary_sport: z.string().nullable(),
  secondary_sports: z.array(z.string()),
  is_verified: z.boolean(),
  verification_status: z.string(),
  physical_stats: z.object({
    gender: z.string().nullable(),
    height_cm: z.number().nullable(),
    weight_kg: z.number().nullable(),
    dominant_side: z.string().nullable(),
  }),
  gti_breakdown: z.object({
    gti: z.number(),
    biomechanical_score: z.number(),
    wearable_consistency_score: z.number(),
    match_performance_score: z.number(),
    posture_points: z.number(),
  }),
  gti_history: z.array(
    z.object({ recorded_at: dateSchema, gti: z.number(), trigger_type: z.string() }),
  ),
  recent_drills: z.array(
    z.object({
      id: uuidSchema,
      sport: z.string(),
      drill_type: z.string(),
      form_score: z.number(),
      frames_analyzed: z.number().int(),
      flaw_flags: jsonSchema,
      signature_hash_prefix: z.string().max(12),
      created_at: dateSchema,
    }),
  ),
  wearable_summary: z.object({
    sessions_monitored: z.number().int(),
    readings_count: z.number().int(),
    avg_heart_rate: z.number().nullable(),
    avg_spo2: z.number().nullable(),
    safety_pauses_count: z.number().int(),
    consistency_score: z.number(),
    simulator_readings: z.number().int(),
    baseline_spo2_readings: z.number().int(),
  }),
  sport_records: z.array(
    z.object({
      sport: z.string(),
      primary_role: z.string(),
      secondary_roles: z.array(z.string()),
      total_matches: z.number().int(),
      win_count: z.number().int(),
      win_streak: z.number().int(),
    }),
  ),
  scout_outreach: z
    .object({
      is_shortlisted: z.boolean(),
      pipeline_status: z.string(),
      notes: z.string(),
      organization_name: z.string().nullable(),
      history: z.array(outreachEventSchema),
    })
    .nullable(),
});
export type ScoutDossierProjection = z.infer<typeof scoutDossierSchema>;
export type OutreachInput = z.infer<typeof outreachSchema>;
