import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  authResponseSchema,
  authUserSchema,
  type AuthResponse,
  type AuthUserSummary,
} from "@/contracts/auth";
import { envelope } from "@/lib/api/response-decoders";
import { ApiError } from "@/lib/api/errors";
import { getEnvironment } from "@/server/env";
import { callNest, type NestRequest } from "@/server/api/nest-client";
import { fail } from "@/server/api/problem";
import { getStore } from "./session-store";

export const sessionSchema = z.object({
  id: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresAt: z.number(),
  expiresAt: z.number(),
  refreshOperationId: z.uuid(),
  user: authUserSchema,
});
export type Session = z.infer<typeof sessionSchema>;
export const sessionCookie = "kheleo_session";
const lifetime = 7 * 24 * 3600;
const lockPollMilliseconds = 50;
const lockWaitAttempts = 300;
type SessionUserPatch = Partial<
  Pick<AuthUserSummary, "email" | "phone" | "isVerified" | "athleteProfileId">
>;
function refreshedUser(
  original: AuthUserSummary,
  latest: AuthUserSummary,
  upstream: AuthUserSummary,
): AuthUserSummary {
  return {
    ...upstream,
    email: latest.email !== original.email ? latest.email : upstream.email,
    phone: latest.phone !== original.phone ? latest.phone : upstream.phone,
    isVerified: latest.isVerified !== original.isVerified ? latest.isVerified : upstream.isVerified,
    athleteProfileId:
      latest.athleteProfileId !== original.athleteProfileId
        ? latest.athleteProfileId
        : upstream.athleteProfileId,
  };
}
export async function saveSession(session: Session): Promise<void> {
  await getStore().set(
    `session:${session.id}`,
    JSON.stringify(session),
    Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1000)),
  );
}
export async function createSession(auth: AuthResponse): Promise<Session> {
  const previous = await readSession();
  if (previous) await getStore().delete(`session:${previous.id}`);
  const session: Session = {
    id: randomBytes(32).toString("hex"),
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    accessExpiresAt: Date.now() + auth.expiresIn * 1000,
    expiresAt: Date.now() + lifetime * 1000,
    refreshOperationId: randomUUID(),
    user: auth.user,
  };
  await saveSession(session);
  const jar = await cookies();
  jar.set(sessionCookie, session.id, {
    httpOnly: true,
    secure: new URL(getEnvironment().APP_ORIGIN).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: lifetime,
  });
  return session;
}
export async function readSession(): Promise<Session | null> {
  const id = (await cookies()).get(sessionCookie)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const raw = await getStore().get(`session:${id}`);
  if (!raw) return null;
  const session = sessionSchema.parse(JSON.parse(raw) as unknown);
  if (session.expiresAt <= Date.now()) return null;
  return session;
}
export async function requireSession(): Promise<Session> {
  const session = await readSession();
  if (!session) fail(401, "Sign in to continue.");
  return session;
}
export async function refreshSession(session: Session, force = false): Promise<Session> {
  if (!force && session.accessExpiresAt > Date.now() + 30000) return session;
  const store = getStore();
  const key = `refresh:${session.id}`;
  const owner = randomUUID();
  for (let attempt = 0; attempt < lockWaitAttempts; attempt++) {
    const raw = await store.get(`session:${session.id}`);
    if (!raw) fail(401, "Your session has ended. Sign in again.");
    const current = sessionSchema.parse(JSON.parse(raw) as unknown);
    if (
      current.accessToken !== session.accessToken ||
      (!force && current.accessExpiresAt > Date.now() + 30000)
    )
      return current;
    if (await store.setIfAbsent(key, owner, 30)) {
      try {
        const latestRaw = await store.get(`session:${session.id}`);
        if (!latestRaw) fail(401, "Your session has ended.");
        const latest = sessionSchema.parse(JSON.parse(latestRaw) as unknown);
        if (latest.accessToken !== session.accessToken) return latest;
        const auth = envelope(authResponseSchema).parse(
          await callNest({
            method: "POST",
            path: "auth/refresh",
            body: JSON.stringify({ refreshToken: latest.refreshToken }),
            operationId: latest.refreshOperationId,
          }),
        );
        if (!(await store.get(`session:${session.id}`))) fail(401, "Your session has ended.");
        const updated: Session = {
          ...latest,
          accessToken: auth.accessToken,
          refreshToken: auth.refreshToken,
          user: refreshedUser(session.user, latest.user, auth.user),
          accessExpiresAt: Date.now() + auth.expiresIn * 1000,
          refreshOperationId: randomUUID(),
        };
        if (
          !(await store.replaceIfExists(
            `session:${session.id}`,
            JSON.stringify(updated),
            Math.max(1, Math.ceil((updated.expiresAt - Date.now()) / 1000)),
          ))
        )
          fail(401, "Your session has ended.");
        return updated;
      } catch (error: unknown) {
        if (error instanceof ApiError && error.problem.status === 401)
          await store.delete(`session:${session.id}`);
        throw error;
      } finally {
        await store.release(key, owner);
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, lockPollMilliseconds));
  }
  fail(503, "Session refresh is taking too long. Retry shortly.");
}
export async function authenticatedNest(
  session: Session,
  request: Omit<NestRequest, "token">,
): Promise<unknown> {
  const active = await refreshSession(session);
  try {
    return await callNest({ ...request, token: active.accessToken });
  } catch (error: unknown) {
    if (!(error instanceof ApiError) || error.problem.status !== 401) throw error;
    const refreshed = await refreshSession(active, true);
    return callNest({ ...request, token: refreshed.accessToken });
  }
}
export async function updateSessionUser(id: string, patch: SessionUserPatch): Promise<void> {
  const store = getStore();
  const key = `refresh:${id}`;
  const owner = randomUUID();
  for (let attempt = 0; attempt < lockWaitAttempts; attempt++) {
    if (await store.setIfAbsent(key, owner, 30)) {
      try {
        const raw = await store.get(`session:${id}`);
        if (!raw) return;
        const current = sessionSchema.parse(JSON.parse(raw) as unknown);
        const next = { ...current, user: { ...current.user, ...patch } };
        await store.replaceIfExists(
          `session:${id}`,
          JSON.stringify(next),
          Math.max(1, Math.ceil((current.expiresAt - Date.now()) / 1000)),
        );
        return;
      } finally {
        await store.release(key, owner);
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, lockPollMilliseconds));
  }
  fail(503, "Session metadata is updating. Retry shortly.");
}
export async function destroySession(): Promise<void> {
  const session = await readSession();
  if (session) await getStore().delete(`session:${session.id}`);
  (await cookies()).delete(sessionCookie);
}
