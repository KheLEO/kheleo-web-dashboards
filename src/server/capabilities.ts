import "server-only";
import { getEnvironment } from "./env";
import type { ApplicationCapabilities } from "@/lib/capabilities";
export function sessionCapabilities(): ApplicationCapabilities {
  const env = getEnvironment();
  return {
    safeEvents: env.SAFE_EVENTS_VERIFIED ? env.SAFE_EVENTS_VERIFIED === "true" : true,
    simulatorIngestion:
      env.SIMULATOR_INGESTION !== undefined
        ? env.SIMULATOR_INGESTION === "true"
        : Boolean(env.TELEMETRY_SERVICE_HMAC_SECRET),
    drillPracticeIngestion:
      env.DRILL_PRACTICE_INGESTION !== undefined
        ? env.DRILL_PRACTICE_INGESTION === "true"
        : Boolean(env.DRILL_HMAC_SECRET),
  };
}
