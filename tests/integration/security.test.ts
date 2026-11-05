// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { signHmac, drillSigningPayload } from "@/server/security/hmac";
import { prepareDrill } from "@/server/api/drill-relay";
import { prepareTelemetry } from "@/server/api/telemetry-relay";
import { assertOrigin } from "@/server/security/request-origin";
import { routeRegistry } from "@/server/api/route-registry";
import { ids } from "@/test/factories";
import { calibratedSession } from "../fixtures/pose";
import { getEnvironment } from "@/server/env";
describe("relay security boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_STORE", "memory");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("APP_ORIGIN", "http://localhost:3001");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("matches the exact drill HMAC format", async () => {
    const drill = {
      sport: "CRICKET",
      drill_type: "TEST",
      form_score: 91.25,
      frames_analyzed: 20,
      timestamp: 1700000000000,
    };
    const payload = drillSigningPayload(ids.athlete, drill);
    expect(JSON.parse(payload) as unknown).toMatchObject({ athlete_id: ids.athlete, ...drill });
    expect(payload).toContain('"joint_angles_summary":{}');
    expect(await signHmac("fixture-secret", payload)).toBe(
      createHmac("sha256", "fixture-secret").update(payload).digest("hex"),
    );
  });
  it("supports the documented API alias while keeping the private URL authoritative", () => {
    vi.stubEnv("NEST_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api/v1");
    expect(getEnvironment().NEST_API_URL).toBe("https://api.example.com/api/v1");
    vi.stubEnv("NEST_API_URL", "http://backend.internal:3000/api/v1");
    expect(getEnvironment().NEST_API_URL).toBe("http://backend.internal:3000/api/v1");
  });
  it("rejects non-HTTP upstream URLs before issuing a request", () => {
    vi.stubEnv("NEST_API_URL", "file:///etc/passwd");
    expect(() => getEnvironment()).toThrow();
  });
  it("rejects a calibrated drill without pose integrity evidence", async () => {
    await expect(prepareDrill(ids.athlete, calibratedSession())).rejects.toMatchObject({
      problem: { status: 403 },
    });
  });
  it("rejects expired and identity-mismatched drill submissions", async () => {
    const drill = calibratedSession();
    await expect(
      prepareDrill(ids.athlete, { ...drill, athlete_id: ids.organizer }),
    ).rejects.toMatchObject({ problem: { status: 403 } });
    await expect(
      prepareDrill(ids.athlete, { ...drill, timestamp: Date.now() - 301000 }),
    ).rejects.toMatchObject({ problem: { status: 403 } });
  });
  it("requires server signing configuration for production simulator ingestion", async () => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("SESSION_STORE", "redis");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    await expect(
      prepareTelemetry(
        ids.athlete,
        {
          athlete_id: ids.athlete,
          heart_rate: 200,
          spo2: 88,
          skin_temperature: 40,
          timestamp: Date.now(),
        },
        true,
      ),
    ).rejects.toMatchObject({ problem: { status: 503 } });
  });
  it("signs staging telemetry over the exact forwarded bytes", async () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("SESSION_STORE", "redis");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("TELEMETRY_SERVICE_HMAC_SECRET", "telemetry-test-secret");
    const result = await prepareTelemetry(
      ids.athlete,
      {
        athlete_id: ids.athlete,
        heart_rate: 200,
        spo2: 88,
        skin_temperature: 40,
        timestamp: Date.now(),
      },
      true,
    );
    expect(result.signature.name).toBe("x-device-signature");
    expect(result.signature.value).toBe(
      createHmac("sha256", "telemetry-test-secret").update(result.body).digest("hex"),
    );
  });
  it("rejects cross-site mutations and unimplemented routes", () => {
    expect(() =>
      assertOrigin(
        new Request("http://localhost:3001/api/session/logout", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow();
    expect(
      routeRegistry.some(
        (entry) => entry.method === "PATCH" && entry.pattern.test(`tournaments/${ids.tournament}`),
      ),
    ).toBe(false);
    expect(routeRegistry.some((entry) => entry.pattern.test("gti/leaderboards"))).toBe(false);
  });
});
it.each([false, true])(
  "signs labeled production telemetry (simulated=%s) with optional competition context",
  async (simulated) => {
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("SESSION_STORE", "redis");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("TELEMETRY_SERVICE_HMAC_SECRET", "telemetry-test-secret");
    try {
      const packet = {
        athlete_id: ids.athlete,
        tournament_id: ids.tournament,
        bracket_id: ids.bracket,
        heart_rate: 202,
        spo2: 88,
        skin_temperature: 40,
        timestamp: Date.now(),
      };
      const result = await prepareTelemetry(ids.athlete, packet, simulated);
      expect(JSON.parse(result.body) as unknown).toMatchObject({
        ...packet,
        source: simulated ? "SIMULATOR" : "BLE",
      });
      expect(result.signature.value).toBe(
        createHmac("sha256", "telemetry-test-secret").update(result.body).digest("hex"),
      );
      await expect(prepareTelemetry(ids.scout, packet, simulated)).rejects.toMatchObject({
        problem: { status: 403 },
      });
      await expect(
        prepareTelemetry(ids.athlete, { ...packet, timestamp: Date.now() - 301000 }, simulated),
      ).rejects.toMatchObject({ problem: { status: 403 } });
    } finally {
      vi.unstubAllEnvs();
    }
  },
);
