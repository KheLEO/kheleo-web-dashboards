import { z } from "zod";
import { uuidSchema } from "./common";
import { rosterMemberSchema } from "./matchmaking";
export const rosterEventSchema = z.object({
  event: z.literal("ROSTER_FORMED"),
  data: z.object({
    team_id: uuidSchema,
    team_name: z.string(),
    bracket_id: uuidSchema,
    roster: z.array(rosterMemberSchema),
  }),
});
export const pauseEventSchema = z.object({
  event_id: uuidSchema.optional(),
  source: z.enum(["BLE", "SIMULATOR", "ATHLETE_JWT", "DEVICE_HMAC"]).optional(),
  baseline_fields: z.array(z.enum(["spo2", "skin_temperature"])).optional(),
  event: z.literal("MATCH_PAUSE_ALERT"),
  severity: z.literal("CRITICAL"),
  athlete_id: uuidSchema,
  athlete_name: z.string(),
  vitals: z.object({ heart_rate: z.number(), spo2: z.number(), skin_temperature: z.number() }),
  directive: z.string(),
  tournament_id: uuidSchema.optional(),
  bracket_id: uuidSchema.optional(),
  match_id: uuidSchema.optional(),
});
export const gtiEventSchema = z.object({
  athleteId: uuidSchema,
  previousGti: z.number(),
  newGti: z.number(),
  eliteBreached: z.boolean(),
});
export type RosterFormedEvent = z.infer<typeof rosterEventSchema>;
export type MatchPauseAlert = z.infer<typeof pauseEventSchema>;
export type GtiUpdatedEvent = z.infer<typeof gtiEventSchema>;
