// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { prepareDrill } from "@/server/api/drill-relay";
import { ids } from "@/test/factories";
beforeEach(() => {
  vi.stubEnv("SESSION_STORE", "redis");
  vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  vi.stubEnv("STAGING_DATA_ISOLATED", "true");
  vi.stubEnv("DRILL_PRACTICE_INGESTION", "true");
  vi.stubEnv("DRILL_HMAC_SECRET", "test-only-hmac-secret");
});
afterEach(() => vi.unstubAllEnvs());
const drill = () => ({
  sport: "CRICKET",
  drill_type: "CRICKET_BOWLING",
  form_score: 80,
  frames_analyzed: 10,
  flaw_flags: [],
  joint_angles_summary: { policy: "practice-angle-v1", validated: false },
  timestamp: Date.now(),
});
it("signs an isolated staging submission in the actual backend format", async () => {
  vi.stubEnv("APP_ENV", "staging");
  const body = drill();
  const result = await prepareDrill(ids.athlete, body);
  expect(result.signature.value).toBe(
    createHmac("sha256", "test-only-hmac-secret")
      .update(`${ids.athlete}:${body.drill_type}:80:${body.timestamp}`)
      .digest("hex"),
  );
  expect(JSON.parse(result.body) as unknown).toMatchObject({
    athlete_id: ids.athlete,
    timestamp: body.timestamp,
  });
});
it("cannot enable provisional scores on production", async () => {
  vi.stubEnv("APP_ENV", "production");
  await expect(prepareDrill(ids.athlete, drill())).rejects.toMatchObject({
    problem: { status: 409, code: "SCORING_NOT_APPROVED" },
  });
});
it("requires an actual known sport/preset pair", async () => {
  vi.stubEnv("APP_ENV", "staging");
  await expect(prepareDrill(ids.athlete, { ...drill(), sport: "FOOTBALL" })).rejects.toMatchObject({
    problem: { status: 400 },
  });
});
