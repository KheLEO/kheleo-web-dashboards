import { z } from "zod";
import { uuidSchema } from "./common";
export const telemetrySchema = z
  .object({
    athlete_id: uuidSchema,
    tournament_id: uuidSchema.optional(),
    bracket_id: uuidSchema.optional(),
    match_id: uuidSchema.optional(),
    heart_rate: z.number().finite().min(1).max(300),
    spo2: z.number().finite().min(0).max(100),
    skin_temperature: z.number().finite().min(20).max(50),
    timestamp: z.number().finite().positive(),
  })
  .strict();
export const telemetryResultSchema = z.object({
  alert_triggered: z.boolean(),
  status: z.enum(["MATCH_PAUSED", "WARNING", "NORMAL"]),
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
