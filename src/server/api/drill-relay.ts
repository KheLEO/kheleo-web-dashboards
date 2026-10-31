import "server-only";
import { practicePresets } from "@/features/drills/drill-catalog";
import { submitDrillSchema } from "@/contracts/drills";
import { drillSigningPayload, signHmac } from "@/server/security/hmac";
import { getEnvironment } from "@/server/env";
import { fail } from "./problem";
export async function prepareDrill(
  userId: string,
  input: unknown,
): Promise<{ body: string; signature: { name: string; value: string } }> {
  const body = submitDrillSchema.parse(input);
  if (body.athlete_id && body.athlete_id !== userId)
    fail(403, "Drill identity must match your account.");
  if (Math.abs(Date.now() - body.timestamp) > 300000)
    fail(403, "The drill submission has expired. Start a new action.");
  const env = getEnvironment();
  if (
    env.APP_ENV !== "staging" ||
    env.STAGING_DATA_ISOLATED !== "true" ||
    env.DRILL_PRACTICE_INGESTION !== "true"
  )
    fail(409, "Production drill submission awaits approved scoring rules.", "SCORING_NOT_APPROVED");
  if (
    !practicePresets.some((preset) => preset.id === body.drill_type && preset.sport === body.sport)
  )
    fail(400, "Choose a supported sport drill preset.");
  return signDrillForRelay(userId, body);
}
export async function signDrillForRelay(
  userId: string,
  input: unknown,
): Promise<{ body: string; signature: { name: string; value: string } }> {
  const body = { ...submitDrillSchema.parse(input), athlete_id: userId };
  const secret = getEnvironment().DRILL_HMAC_SECRET;
  if (!secret) fail(503, "Drill signing is not configured.");
  return {
    body: JSON.stringify(body),
    signature: {
      name: "x-drill-signature",
      value: await signHmac(secret, drillSigningPayload(userId, body)),
    },
  };
}
