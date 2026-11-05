// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { callNest, cookie } = vi.hoisted(() => ({
  callNest: vi.fn(),
  cookie: { value: "a".repeat(64) },
}));
vi.mock("@/server/api/nest-client", () => ({ callNest }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => cookie, delete: vi.fn() }),
}));
import { relay } from "@/server/api/relay";
import { MemoryStore, getStore } from "@/server/auth/session-store";
import { saveSession } from "@/server/auth/session";
import { ids, makeUser } from "@/test/factories";
const operation = "90000000-0000-4000-8000-000000000001";
function request(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost:3001/api/backend/${path}`, {
    method,
    headers: {
      origin: "http://localhost:3001",
      "content-type": "application/json",
      "idempotency-key": operation,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("allowlisted relay", () => {
  beforeEach(async () => {
    vi.stubEnv("SESSION_STORE", "memory");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("APP_ORIGIN", "http://localhost:3001");
    (globalThis as typeof globalThis & { kheleoStore?: MemoryStore }).kheleoStore =
      new MemoryStore();
    callNest.mockReset();
    await saveSession({
      id: cookie.value,
      accessToken: "token",
      refreshToken: "refresh",
      accessExpiresAt: Date.now() + 900000,
      expiresAt: Date.now() + 86400000,
      refreshOperationId: operation,
      user: makeUser(),
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("blocks unsupported routes without contacting NestJS", async () => {
    const response = await relay(request("gti/leaderboards", "GET"), ["gti", "leaderboards"]);
    expect(response.status).toBe(404);
    expect(callNest).not.toHaveBeenCalled();
  });
  it("blocks another user's private details", async () => {
    const response = await relay(request(`users/${ids.organizer}`, "GET"), [
      "users",
      ids.organizer,
    ]);
    expect(response.status).toBe(403);
    expect(callNest).not.toHaveBeenCalled();
  });
  it("checks persona permissions on direct API requests", async () => {
    const response = await relay(request("scouts/feed", "GET"), ["scouts", "feed"]);
    expect(response.status).toBe(403);
    expect(callNest).not.toHaveBeenCalled();
  });
  it("rejects noncontract fields before forwarding", async () => {
    const response = await relay(
      request(`users/${ids.athlete}`, "PATCH", { email: "new@example.com", role: "SUPER_ADMIN" }),
      ["users", ids.athlete],
    );
    expect(response.status).toBe(400);
    expect(callNest).not.toHaveBeenCalled();
  });
  it.each([{ verifiedMetrics: { bowlingSpeedKmh: 160 } }, { earnedBadges: [{ id: "champion" }] }])(
    "rejects athlete-authored verification fields: %j",
    async (extra) => {
      const response = await relay(
        request(`passport/${ids.athlete}/sports`, "POST", {
          sport: "CRICKET",
          primaryRole: "BOWLER",
          ...extra,
        }),
        ["passport", ids.athlete, "sports"],
      );
      expect(response.status).toBe(400);
      expect(callNest).not.toHaveBeenCalled();
    },
  );
  it("forwards a stable operation and rejects payload reuse", async () => {
    callNest.mockResolvedValue({
      success: true,
      data: {
        ...makeUser(),
        isActive: true,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      timestamp: "now",
    });
    const path = `users/${ids.athlete}`;
    const first = await relay(request(path, "PATCH", { email: "new@example.com" }), [
      "users",
      ids.athlete,
    ]);
    expect(first.status).toBe(200);
    expect(callNest.mock.calls[0]?.[0]).toMatchObject({
      token: "token",
      operationId: operation,
      body: '{"email":"new@example.com"}',
    });
    const changed = await relay(request(path, "PATCH", { email: "other@example.com" }), [
      "users",
      ids.athlete,
    ]);
    expect(changed.status).toBe(409);
    expect(callNest).toHaveBeenCalledTimes(1);
  });
  it("ends the local session in the same request as self-deactivation", async () => {
    callNest.mockResolvedValue({
      success: true,
      data: {
        ...makeUser(),
        isActive: false,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      timestamp: "now",
    });
    const response = await relay(request(`users/${ids.athlete}`, "DELETE", {}), [
      "users",
      ids.athlete,
    ]);
    expect(response.status).toBe(200);
    expect(await getStore().get(`session:${cookie.value}`)).toBeNull();
    const next = await relay(request(`users/${ids.athlete}`, "GET"), ["users", ids.athlete]);
    expect(next.status).toBe(401);
    expect(callNest).toHaveBeenCalledTimes(2);
    expect(callNest.mock.calls[0]?.[0]).toMatchObject({ method: "POST", path: "auth/logout" });
    expect(callNest.mock.calls[1]?.[0]).toMatchObject({
      method: "DELETE",
      path: `users/${ids.athlete}`,
    });
  });
});
