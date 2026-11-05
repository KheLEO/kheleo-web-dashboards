import "server-only";
import { getEnvironment } from "./env";
import type { ApplicationCapabilities } from "@/lib/capabilities";
export function sessionCapabilities(): ApplicationCapabilities {
  const env = getEnvironment();
  return {
    safeEvents: true,
    simulatorIngestion: Boolean(env.TELEMETRY_SERVICE_HMAC_SECRET),
    drillPracticeIngestion: Boolean(env.DRILL_HMAC_SECRET),
  };
}
