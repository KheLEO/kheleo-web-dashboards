import "server-only";
import { getEnvironment } from "./env";
import type { ApplicationCapabilities } from "@/lib/capabilities";
export function sessionCapabilities(): ApplicationCapabilities {
  const env = getEnvironment();
  const isolated = env.APP_ENV === "staging" && env.STAGING_DATA_ISOLATED === "true";
  return {
    safeEvents: env.SAFE_EVENTS_VERIFIED === "true",
    simulatorIngestion: isolated && env.SIMULATOR_INGESTION === "true",
    drillPracticeIngestion: isolated && env.DRILL_PRACTICE_INGESTION === "true",
  };
}
