import { sessionCapabilities } from "@/server/capabilities";
import "server-only";
import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { authResponseSchema, loginSchema, registerSchema } from "@/contracts/auth";
import { ApiError } from "@/lib/api/errors";
import { envelope } from "@/lib/api/response-decoders";
import {
  createSession,
  destroySession,
  readSession,
  requireSession,
  refreshSession,
  authenticatedNest,
} from "@/server/auth/session";
import { assertOrigin } from "@/server/security/request-origin";
import { operationId } from "@/server/security/operation-store";
import { rateLimit } from "@/server/security/rate-limit";
import { callNest } from "./nest-client";
import { fail, privateJson, problemResponse } from "./problem";
export type SessionAction = "register" | "login" | "me" | "refresh" | "logout" | "socket-token";
export async function sessionHandler(request: Request, action: SessionAction): Promise<Response> {
  try {
    assertOrigin(request);
    if (action === "login" || action === "register") {
      const text = await request.text();
      if (text.length > 16384) fail(413, "Request payload is too large.");
      const input =
        action === "login"
          ? loginSchema.parse(JSON.parse(text) as unknown)
          : registerSchema.parse(JSON.parse(text) as unknown);
      const identity = createHash("sha256")
        .update(`${input.phone ?? ""}:${input.email ?? ""}`)
        .digest("hex");
      await rateLimit(`auth:${identity}`, 10);
      const auth = envelope(authResponseSchema).parse(
        await callNest({
          method: "POST",
          path: `auth/${action}`,
          body: JSON.stringify(input),
          operationId: operationId(request),
        }),
      );
      const session = await createSession(auth);
      return privateJson({
        user: session.user,
        expiresAt: session.expiresAt,
        capabilities: sessionCapabilities(),
      });
    }
    if (action === "logout") {
      const session = await readSession();
      try {
        if (session)
          await authenticatedNest(session, {
            method: "POST",
            path: "auth/logout",
            operationId: randomUUID(),
          });
      } catch (error: unknown) {
        if (!(error instanceof ApiError) || ![401, 403].includes(error.problem.status)) throw error;
      } finally {
        await destroySession();
      }
      return privateJson({ loggedOut: true });
    }
    const session = await refreshSession(await requireSession());
    if (action === "socket-token") {
      await rateLimit(`socket-token:${session.user.id}`, 30);
      return privateJson({ token: session.accessToken, expiresAt: session.accessExpiresAt });
    }
    if (action === "refresh") await rateLimit(`refresh:${session.user.id}`, 20);
    return privateJson({
      user: session.user,
      expiresAt: session.expiresAt,
      capabilities: sessionCapabilities(),
    });
  } catch (error: unknown) {
    return problemResponse(
      error instanceof SyntaxError
        ? new z.ZodError([{ code: "custom", path: [], message: "Invalid JSON" }])
        : error,
    );
  }
}
