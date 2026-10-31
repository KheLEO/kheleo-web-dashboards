// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { rateLimit } from "@/server/security/rate-limit";
import { MemoryStore } from "@/server/auth/session-store";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("bounds concurrent requests per identity and releases the next fixed window", async () => {
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("SESSION_STORE", "memory");
  (globalThis as typeof globalThis & { kheleoStore?: MemoryStore }).kheleoStore = new MemoryStore();
  vi.useFakeTimers();
  vi.setSystemTime(180000);
  const outcomes = await Promise.allSettled(
    Array.from({ length: 50 }, () => rateLimit("burst", 10, 60)),
  );
  expect(outcomes.filter((entry) => entry.status === "fulfilled")).toHaveLength(10);
  for (const result of outcomes)
    if (result.status === "rejected")
      expect(result.reason as unknown).toMatchObject({ problem: { status: 429 } });
  await expect(rateLimit("different-identity", 10, 60)).resolves.toBeUndefined();
  vi.setSystemTime(240000);
  await expect(rateLimit("burst", 10, 60)).resolves.toBeUndefined();
});
