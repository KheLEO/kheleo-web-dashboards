// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { clientIpHeaders, forwardedClientIp } from "@/server/security/client-ip";
import { gtiSchema } from "@/contracts/gti";

const state = vi.hoisted(() => ({ request: vi.fn(), headers: new Headers() }));
vi.mock("axios", () => ({ default: { create: () => ({ request: state.request }) } }));
vi.mock("next/headers", () => ({ headers: async () => state.headers }));
vi.mock("@/server/env", () => ({
  getEnvironment: () => ({
    NEST_API_URL: "https://backend.example.test/api/v1",
    TELEMETRY_SERVICE_HMAC_SECRET: "test-only-shared-secret",
  }),
}));
import { callNest } from "@/server/api/nest-client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("takes only the configured trusted suffix and rejects malformed forwarding assertions", () => {
  expect(forwardedClientIp(new Headers({ "x-forwarded-for": "forged, 203.0.113.42" }), 1)).toBe(
    "203.0.113.42",
  );
  expect(
    forwardedClientIp(
      new Headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.42, 192.0.2.1" }),
      2,
    ),
  ).toBe("203.0.113.42");
  expect(
    forwardedClientIp(new Headers({ "x-forwarded-for": "203.0.113.42, malicious" }), 1),
  ).toBeNull();
  expect(forwardedClientIp(new Headers({ "x-real-ip": "203.0.113.42" }), 1)).toBe("203.0.113.42");
  expect(forwardedClientIp(new Headers({ "x-forwarded-for": "203.0.113.42" }), 0)).toBeNull();
});

it("signs the sanitized address with a separate key domain and never forwards a chain", () => {
  const ip = "203.0.113.42";
  const now = 1800000000000;
  const headers = clientIpHeaders(ip, "test-only", now);
  const key = createHmac("sha256", "test-only").update("kheleo/bff-client-ip/v1").digest();
  expect(headers["X-Forwarded-For"]).toBe(ip);
  expect(headers["X-Kheleo-Client-Signature"]).toBe(
    createHmac("sha256", key).update(`${now}\n${ip}`).digest("hex"),
  );
  expect(clientIpHeaders("203.0.113.42, 192.0.2.1", "test-only")).toEqual({});
});

it("the actual BFF call forwards a signed sanitized client IP with existing auth and mutation headers", async () => {
  vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
  vi.stubEnv("BFF_PROXY_SECRET", "test-only");
  state.headers = new Headers({
    "x-forwarded-for": "attacker-prefix, 203.0.113.42",
    "x-kheleo-client-ip": "198.51.100.10",
  });
  state.request.mockResolvedValue({ data: { ok: true } });
  await callNest({
    method: "POST",
    path: "auth/login",
    token: "jwt",
    operationId: "op",
    body: "{}",
  });
  expect(state.request.mock.calls[0]?.[0]).toMatchObject({
    headers: {
      "X-Forwarded-For": "203.0.113.42",
      "X-Kheleo-Client-IP": "203.0.113.42",
      Authorization: "Bearer jwt",
      "Idempotency-Key": "op",
    },
  });
  vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
  await callNest({ method: "GET", path: "health" });
  expect(state.request.mock.calls[1]?.[0].headers).not.toHaveProperty("X-Forwarded-For");
});

it("retains the backend effective weights and calculation mode at the API schema boundary", () => {
  const payload = {
    athleteId: "00000000-0000-4000-8000-000000000001",
    gti: 30,
    previousGti: 30,
    biomechanicalScore: 0,
    wearableScore: 50,
    matchPerformanceScore: 50,
    eliteBreached: false,
    scoutAlertTriggered: false,
    weights: { w1: 0, w2: 0, w3: 0 },
    calculationMode: "ONBOARDING_BASELINE",
  };
  expect(gtiSchema.parse(payload)).toEqual(payload);
});
