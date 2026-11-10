import "server-only";
import { z } from "zod";
const httpUrl = z.url({ protocol: /^https?$/ });
const schema = z.object({
  APP_ORIGIN: httpUrl.default("http://localhost:3001"),
  NEST_API_URL: httpUrl,
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  REDIS_URL: z.url().optional(),
  SESSION_STORE: z.enum(["redis", "memory"]).default("redis"),
  DRILL_HMAC_SECRET: z.string().optional(),
  TELEMETRY_SERVICE_HMAC_SECRET: z.string().optional(),
  SAFE_EVENTS_VERIFIED: z.string().optional(),
  DRILL_PRACTICE_INGESTION: z.string().optional(),
  SIMULATOR_INGESTION: z.string().optional(),
  STAGING_DATA_ISOLATED: z.string().optional(),
});
export type ServerEnvironment = z.infer<typeof schema>;
export function getEnvironment(): ServerEnvironment {
  const env = schema.parse({
    ...process.env,
    NEST_API_URL:
      process.env.NEST_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
  });
  if (
    (process.env.NODE_ENV === "production" ||
      env.APP_ENV === "production" ||
      env.APP_ENV === "staging") &&
    env.SESSION_STORE === "memory"
  )
    throw new Error("Redis sessions are required outside local development and tests.");
  if (env.SESSION_STORE === "redis" && !env.REDIS_URL)
    throw new Error(
      "REDIS_URL must be configured. For local development only, set SESSION_STORE=memory.",
    );
  return env;
}
