import "server-only";
import { z } from "zod";
import {
  requireSession,
  authenticatedNest,
  updateSessionUser,
  destroySession,
} from "@/server/auth/session";
import { verificationSchema } from "@/contracts/auth";
import { passportSchema } from "@/contracts/passport";
import { userSchema } from "@/contracts/users";
import { assertOrigin } from "@/server/security/request-origin";
import { operationId, registerOperation } from "@/server/security/operation-store";
import { rateLimit } from "@/server/security/rate-limit";
import { envelope } from "@/lib/api/response-decoders";
import { routeRegistry } from "./route-registry";
import { prepareDrill } from "./drill-relay";
import { prepareTelemetry } from "./telemetry-relay";
import { fail, privateJson, problemResponse } from "./problem";
export async function relay(request: Request, parts: string[]): Promise<Response> {
  try {
    assertOrigin(request);
    if (parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) fail(404, "Unknown API route.");
    const path = parts.join("/");
    const route = routeRegistry.find(
      (entry) => entry.method === request.method && entry.pattern.test(path),
    );
    if (!route) fail(404, "This API capability is not available.");
    const session = await requireSession();
    await rateLimit(`relay:${session.user.id}`, 180);
    if (route.roles && !route.roles.includes(session.user.role))
      fail(403, "Your role cannot perform this operation.");
    const targetId = route.pattern.exec(path)?.[1];
    if (route.identity && targetId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      const passportReader =
        route.identity === "passport-read" &&
        ["SCOUT", "FEDERATION_ADMIN"].includes(session.user.role);
      const gtiAdmin =
        path.startsWith("gti/recalculate/") && session.user.role === "FEDERATION_ADMIN";
      if (!passportReader && !gtiAdmin) fail(403, "You cannot access another account's resource.");
    }
    const query = z
      .record(z.string(), z.unknown())
      .parse(route.query.parse(Object.fromEntries(new URL(request.url).searchParams)));
    if (route.ownsTournament && session.user.role === "ORGANIZER") {
      const tournament = envelope(z.object({ organizerId: z.string() })).parse(
        await authenticatedNest(session, { method: "GET", path: `tournaments/${targetId}` }),
      );
      if (tournament.organizerId !== session.user.id)
        fail(403, "You can only modify your own tournament.");
    }
    if (!route.body)
      return privateJson(await authenticatedNest(session, { method: request.method, path, query }));
    const maxPayloadBytes = route.signed === "drill" ? 2 * 1024 * 1024 : 262144;
    if (Number(request.headers.get("content-length") ?? "0") > maxPayloadBytes)
      fail(413, "Request payload is too large.");
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxPayloadBytes)
      fail(413, "Request payload is too large.");
    const parsed: unknown = text ? (JSON.parse(text) as unknown) : {};
    const body = route.body.parse(parsed);
    const id = operationId(request);
    const prepared =
      route.signed === "drill"
        ? await prepareDrill(session.user.id, body, request.headers.get("x-client-pose-digest"))
        : route.signed === "telemetry"
          ? await prepareTelemetry(
              session.user.id,
              body,
              request.headers.get("x-kheleo-simulator") === "true",
            )
          : { body: JSON.stringify(body) };
    await registerOperation(session.user.id, `${request.method}:${path}`, id, prepared.body);
    if (path === `users/${session.user.id}` && request.method === "DELETE")
      await authenticatedNest(session, { method: "POST", path: "auth/logout", operationId: id });
    const response = await authenticatedNest(session, {
      method: request.method,
      path,
      query,
      operationId: id,
      ...prepared,
    });
    if (path === "auth/verify-government-id" || path === "auth/verify-gov-id") {
      const verification = envelope(verificationSchema).parse(response);
      await updateSessionUser(session.id, { isVerified: verification.verified });
    }
    if (
      (path === `passport/${session.user.id}` || path === "users/profile") &&
      request.method === "POST"
    ) {
      const passport = envelope(passportSchema).parse(response);
      await updateSessionUser(session.id, { athleteProfileId: passport.athleteProfileId });
    }
    if (path === `users/${session.user.id}` && request.method === "PATCH") {
      const user = envelope(userSchema).parse(response);
      await updateSessionUser(session.id, { email: user.email, phone: user.phone });
    }
    if (path === `users/${session.user.id}` && request.method === "DELETE") {
      const user = envelope(userSchema).parse(response);
      if (!user.isActive) {
        await destroySession();
      }
    }
    return privateJson(response);
  } catch (error: unknown) {
    return problemResponse(
      error instanceof SyntaxError
        ? new z.ZodError([{ code: "custom", path: [], message: "Invalid JSON" }])
        : error,
    );
  }
}
