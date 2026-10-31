import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, asApiError } from "@/lib/api/errors";
import { recordEvent } from "@/server/observability/logger";
export function fail(status: number, detail: string, code?: string): never {
  throw new ApiError({
    type: "about:blank",
    title: status === 403 ? "Forbidden" : "Request failed",
    status,
    detail,
    instance: "",
    timestamp: new Date().toISOString(),
    ...(code ? { code } : {}),
  });
}
export function problemResponse(error: unknown): NextResponse {
  const requestId = crypto.randomUUID();
  const issue =
    error instanceof ZodError
      ? new ApiError({
          type: "about:blank",
          title: "Validation failed",
          status: 400,
          detail: "Check the highlighted fields and try again.",
          instance: "",
          timestamp: new Date().toISOString(),
          invalidParams: error.issues.map((entry) => ({
            name: entry.path.join("."),
            reason: entry.message,
          })),
        })
      : asApiError(error);
  const safe =
    issue.problem.status >= 500
      ? {
          ...issue.problem,
          detail: "The service is unavailable. Check the connection or try again shortly.",
        }
      : issue.problem;
  if (safe.status >= 500)
    recordEvent({ name: "upstream-unavailable", requestId, status: safe.status });
  return NextResponse.json(safe, {
    status: safe.status,
    headers: {
      "Content-Type": "application/problem+json",
      "Cache-Control": "private, no-store",
      "X-Request-Id": requestId,
    },
  });
}
export function privateJson<T>(data: T): NextResponse {
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
