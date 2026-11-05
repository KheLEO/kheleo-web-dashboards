// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/server/auth/session";
const { callNest, jar } = vi.hoisted(() => ({ callNest: vi.fn(), jar: new Map<string, string>() }));
vi.mock("@/server/api/nest-client", () => ({ callNest }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
    delete: (key: string) => jar.delete(key),
  }),
}));
import {
  refreshSession,
  saveSession,
  authenticatedNest,
  updateSessionUser,
} from "@/server/auth/session";
import { sessionHandler } from "@/server/api/session-handler";
import { MemoryStore, getStore } from "@/server/auth/session-store";
import { ApiError } from "@/lib/api/errors";
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "athlete@example.com",
  phone: null,
  role: "ATHLETE" as const,
  isVerified: true,
  athleteProfileId: null,
};
function session(): Session {
  return {
    id: "a".repeat(64),
    user,
    accessToken: "old",
    refreshToken: "refresh-old",
    accessExpiresAt: Date.now() - 1,
    expiresAt: Date.now() + 60000,
    refreshOperationId: "10000000-0000-4000-8000-000000000002",
  };
}
describe("refresh coordination", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_STORE", "memory");
    vi.stubEnv("APP_ENV", "test");
    (globalThis as typeof globalThis & { kheleoStore?: MemoryStore }).kheleoStore =
      new MemoryStore();
    callNest.mockReset();
    jar.clear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  it("does not recreate a session deleted while refresh is in flight", async () => {
    const original = session();
    await saveSession(original);
    let finish: ((result: unknown) => void) | undefined;
    callNest.mockImplementation(
      () =>
        new Promise<unknown>((resolve) => {
          finish = resolve;
        }),
    );
    const pending = refreshSession(original);
    await vi.waitFor(() => expect(callNest).toHaveBeenCalledTimes(1));
    await getStore().delete(`session:${original.id}`);
    finish?.({
      success: true,
      timestamp: "now",
      data: {
        accessToken: "new",
        refreshToken: "new-refresh",
        tokenType: "Bearer",
        expiresIn: 900,
        user,
      },
    });
    await expect(pending).rejects.toMatchObject({ problem: { status: 401 } });
    expect(await getStore().get(`session:${original.id}`)).toBeNull();
  });
  it("updates account metadata without overwriting rotated tokens", async () => {
    const original = session();
    await saveSession(original);
    callNest.mockResolvedValue({
      success: true,
      timestamp: "now",
      data: {
        accessToken: "new",
        refreshToken: "new-refresh",
        tokenType: "Bearer",
        expiresIn: 900,
        user,
      },
    });
    await Promise.all([
      refreshSession(original),
      updateSessionUser(original.id, { email: "updated@example.com" }),
    ]);
    const raw = await getStore().get(`session:${original.id}`);
    expect(JSON.parse(raw ?? "null") as unknown).toMatchObject({
      accessToken: "new",
      user: { email: "updated@example.com" },
    });
  });
  it("rotates once across competing requests without extending session expiry", async () => {
    const original = session();
    await saveSession(original);
    callNest.mockImplementation(async () => ({
      success: true,
      data: {
        accessToken: "new",
        refreshToken: "refresh-new",
        tokenType: "Bearer",
        expiresIn: 900,
        user,
      },
      timestamp: "now",
    }));
    const results = await Promise.all(Array.from({ length: 8 }, () => refreshSession(original)));
    expect(callNest).toHaveBeenCalledTimes(1);
    expect(
      results.every(
        (result) => result.accessToken === "new" && result.expiresAt === original.expiresAt,
      ),
    ).toBe(true);
  });
  it("waits for a slow refresh within the upstream timeout across concurrent requests", async () => {
    vi.useFakeTimers();
    const original = session();
    await saveSession(original);
    callNest.mockImplementation(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 7000));
      return {
        success: true,
        data: {
          accessToken: "new",
          refreshToken: "refresh-new",
          tokenType: "Bearer",
          expiresIn: 900,
          user,
        },
        timestamp: "now",
      };
    });
    const assertion = expect(
      Promise.all(Array.from({ length: 8 }, () => refreshSession(original))),
    ).resolves.toHaveLength(8);
    await vi.advanceTimersByTimeAsync(7100);
    await assertion;
    expect(callNest).toHaveBeenCalledTimes(1);
  });
  it("preserves operation and body across a 401 refresh retry", async () => {
    const original = { ...session(), accessExpiresAt: Date.now() + 900000 };
    await saveSession(original);
    const unauthorized = new ApiError({
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "Expired",
      instance: "",
      timestamp: "now",
    });
    callNest
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: "new",
          refreshToken: "refresh-new",
          tokenType: "Bearer",
          expiresIn: 900,
          user,
        },
        timestamp: "now",
      })
      .mockResolvedValueOnce({ success: true });
    await authenticatedNest(original, {
      method: "POST",
      path: "drills/submit",
      body: '{"timestamp":123}',
      operationId: "same-operation",
    });
    expect(callNest.mock.calls[0]?.[0]).toMatchObject({
      operationId: "same-operation",
      body: '{"timestamp":123}',
      token: "old",
    });
    expect(callNest.mock.calls[2]?.[0]).toMatchObject({
      operationId: "same-operation",
      body: '{"timestamp":123}',
      token: "new",
    });
  });
});

describe("upstream logout", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_STORE", "memory");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("APP_ORIGIN", "http://localhost:3001");
    (globalThis as typeof globalThis & { kheleoStore?: MemoryStore }).kheleoStore =
      new MemoryStore();
    callNest.mockReset();
    jar.clear();
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([false, true])(
    "revokes upstream and clears the local session, including upstream failure=%s",
    async (failure) => {
      const current = { ...session(), accessExpiresAt: Date.now() + 900000 };
      await saveSession(current);
      jar.set("kheleo_session", current.id);
      if (failure) callNest.mockRejectedValue(new Error("Upstream unavailable"));
      else callNest.mockResolvedValue({ success: true, message: "Logged out" });
      const response = await sessionHandler(
        new Request("http://localhost:3001/api/session/logout", {
          method: "POST",
          headers: { origin: "http://localhost:3001" },
        }),
        "logout",
      );
      expect(callNest).toHaveBeenCalledWith(
        expect.objectContaining({ method: "POST", path: "auth/logout", token: "old" }),
      );
      expect(await getStore().get(`session:${current.id}`)).toBeNull();
      expect(jar.has("kheleo_session")).toBe(false);
      expect(response.status).toBe(failure ? 500 : 200);
    },
  );
});
