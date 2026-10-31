import "server-only";
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
  // There is no approved scoring policy in the current platform contracts.
  fail(409, "Production drill submission awaits approved scoring rules.", "SCORING_NOT_APPROVED");
}
export async function signApprovedDrill(
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
