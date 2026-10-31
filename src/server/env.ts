import "server-only";
import { z } from "zod";
const schema = z.object({
  APP_ORIGIN: z.url().default("http://localhost:3001"),
  NEST_API_URL: z.url().default("http://localhost:3000/api/v1"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  REDIS_URL: z.url().optional(),
  SESSION_STORE: z.enum(["redis", "memory"]).default("redis"),
  DRILL_PRACTICE_INGESTION: z.string().default("false"),
  DRILL_HMAC_SECRET: z.string().optional(),
  TELEMETRY_SERVICE_HMAC_SECRET: z.string().optional(),
  SAFE_EVENTS_VERIFIED: z.string().default("false"),
  SIMULATOR_INGESTION: z.string().default("false"),
  STAGING_DATA_ISOLATED: z.string().default("false"),
});
export type ServerEnvironment = z.infer<typeof schema>;
export function getEnvironment(): ServerEnvironment {
  const env = schema.parse(process.env);
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
