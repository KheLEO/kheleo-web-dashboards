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
  const parsed = telemetrySchema.parse(input);
  if (parsed.athlete_id !== userId) fail(403, "Telemetry identity must match your account.");
  if (Math.abs(Date.now() - parsed.timestamp) > 300000)
    fail(403, "Telemetry expired. Take a fresh reading.");
  const source = simulated ? "SIMULATOR" : "BLE";
  if (parsed.source && parsed.source !== source) fail(400, "Telemetry source labels disagree.");
  if (source === "SIMULATOR" && parsed.baseline_fields?.length)
    fail(400, "Simulator readings cannot claim hardware baseline fields.");
  const secret = getEnvironment().TELEMETRY_SERVICE_HMAC_SECRET;
  if (!secret) fail(503, "Telemetry signing is not configured.");
  const body = JSON.stringify({ ...parsed, athlete_id: userId, source });
  return {
    body,
    signature: { name: "x-device-signature", value: await signHmac(secret, body) },
  };
}
