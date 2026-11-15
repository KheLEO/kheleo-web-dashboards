// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

afterEach(() => vi.unstubAllEnvs());

it("answers unauthenticated readiness probes with a noncached success and the running revision", async () => {
  const revision = "a".repeat(40);
  vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", revision);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.has("Set-Cookie")).toBe(false);
  expect(await response.json()).toEqual({ status: "ok", revision });
  // Read runtime metadata on each request, rather than embedding a build-time value.
  vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "b".repeat(40));
  expect(await (await GET()).json()).toEqual({ status: "ok", revision: "b".repeat(40) });
});

it("works without Railway metadata and never exposes an invalid environment value", async () => {
  for (const value of ["", "invalid-metadata-value"]) {
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", value);
    const response = await GET();
    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ status: "ok", revision: "unknown" });
  }
});
