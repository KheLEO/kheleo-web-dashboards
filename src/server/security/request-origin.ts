import "server-only";
import { getEnvironment } from "@/server/env";
import { fail } from "@/server/api/problem";
export function assertOrigin(request: Request): void {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    fail(403, "Cross-site requests are not permitted.");
  if (
    !["GET", "HEAD"].includes(request.method) &&
    request.headers.get("origin") !== new URL(getEnvironment().APP_ORIGIN).origin
  )
    fail(403, "This request must originate from the KheLEO application.");
}
