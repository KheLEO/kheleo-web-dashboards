import { z } from "zod";
import { cursorPageSchema, dateSchema, uuidSchema } from "./common";
export const telemetrySchema = z
  .object({
    athlete_id: uuidSchema,
    tournament_id: uuidSchema.optional(),
    bracket_id: uuidSchema.optional(),
    match_id: uuidSchema.optional(),
    source: z.enum(["BLE", "SIMULATOR"]).optional(),
    baseline_fields: z
      .array(z.enum(["spo2", "skin_temperature"]))
      .max(2)
      .optional(),
    heart_rate: z.number().finite().min(20).max(260),
    spo2: z.number().finite().min(50).max(100),
    skin_temperature: z.number().finite().min(25).max(45),
    timestamp: z.number().finite().positive(),
  })
  .strict();
export const telemetryResultSchema = z.object({
  alert_triggered: z.boolean(),
  status: z.enum(["MATCH_PAUSED", "CRITICAL_ALERT", "WARNING", "NORMAL"]),
  message: z.string().optional(),
});
export type TelemetryRequest = z.infer<typeof telemetrySchema>;
export type TelemetryResponse = z.infer<typeof telemetryResultSchema>;
export function classifyVitals(
  vitals: Pick<TelemetryRequest, "heart_rate" | "spo2" | "skin_temperature">,
): "CRITICAL" | "WARNING" | "NORMAL" {
  if (vitals.heart_rate > 195 || vitals.spo2 < 90 || vitals.skin_temperature > 39.5)
    return "CRITICAL";
  if (vitals.heart_rate > 185 || vitals.spo2 < 93 || vitals.skin_temperature > 38.5)
    return "WARNING";
  return "NORMAL";
}

export const acknowledgeSafetySchema = z
  .object({
    medicalCheckNote: z.string().trim().min(5).max(1000),
    medicalCheckDispatched: z.literal(true),
  })
  .strict();
export const resumeSafetySchema = z
  .object({
    medicalClearanceConfirmed: z.literal(true),
    medicalClearanceNote: z.string().trim().min(5).max(1000),
  })
  .strict();
export const healthAlertSchema = z.object({
  id: uuidSchema,
  athleteId: uuidSchema,
  tournamentId: uuidSchema.nullable(),
  bracketId: uuidSchema.nullable(),
  matchId: uuidSchema.nullable(),
  severity: z.enum(["NORMAL", "WARNING", "CRITICAL"]),
  heartRate: z.number(),
  spo2: z.number(),
  skinTemperature: z.number(),
  triggerReason: z.string(),
  matchPaused: z.boolean(),
  source: z.string(),
  baselineFields: z.array(z.string()),
  acknowledgedAt: dateSchema.nullable(),
  acknowledgedById: uuidSchema.nullable(),
  medicalCheckNote: z.string().nullable(),
  medicalCheckDispatched: z.boolean(),
  createdAt: dateSchema,
});
export const athleteVitalsSchema = z.object({
  athleteId: uuidSchema,
  name: z.string(),
  heart_rate: z.number().nullable(),
  spo2: z.number().nullable(),
  skin_temperature: z.number().nullable(),
  severity: z.enum(["NORMAL", "WARNING", "CRITICAL", "AWAITING_READING"]),
  observedAt: dateSchema.nullable(),
  source: z.string().nullable(),
  baseline_fields: z.array(z.string()),
  matchId: uuidSchema.nullable(),
  matchStatus: z.string().nullable(),
});
export const safetyMatchSchema = z.object({
  id: uuidSchema,
  bracketId: uuidSchema,
  status: z.string(),
  pauseReason: z.string().nullable(),
});
export const vitalsPageSchema = cursorPageSchema(athleteVitalsSchema).extend({
  matches: z.array(safetyMatchSchema),
  activeAlerts: z.array(healthAlertSchema).default([]),
});
export const safetyHistoryPageSchema = cursorPageSchema(healthAlertSchema);
export type HealthAlert = z.infer<typeof healthAlertSchema>;
export type AthleteVitals = z.infer<typeof athleteVitalsSchema>;
