import "server-only";
import { telemetrySchema } from "@/contracts/safety";
import { signHmac } from "@/server/security/hmac";
import { getEnvironment } from "@/server/env";
import { fail } from "./problem";
export async function prepareTelemetry(
  userId: string,
  input: unknown,
  simulated: boolean,
): Promise<{ body: string; signature: { name: string; value: string } }> {
  const env = getEnvironment();
  const parsed = telemetrySchema.parse(input);
  if (parsed.athlete_id !== userId) fail(403, "Telemetry identity must match your account.");
  if (Math.abs(Date.now() - parsed.timestamp) > 300000)
    fail(403, "Telemetry expired. Take a fresh reading.");
  if (!simulated)
    fail(
      409,
      "Complete hardware vitals and authorized match context are not available yet.",
      "HARDWARE_CONTRACT_PENDING",
    );
  if (
    env.APP_ENV !== "staging" ||
    env.SIMULATOR_INGESTION !== "true" ||
    env.STAGING_DATA_ISOLATED !== "true"
  )
    fail(403, "Simulator ingestion is restricted to an isolated staging deployment.");
  if (parsed.match_id || parsed.bracket_id || parsed.tournament_id)
    fail(409, "Simulator ingestion cannot target tournament or match records.");
  if (!env.TELEMETRY_SERVICE_HMAC_SECRET) fail(503, "Telemetry signing is not configured.");
  const body = JSON.stringify({ ...parsed, athlete_id: userId });
  return {
    body,
    signature: {
      name: "x-device-signature",
      value: await signHmac(env.TELEMETRY_SERVICE_HMAC_SECRET, body),
    },
  };
}
