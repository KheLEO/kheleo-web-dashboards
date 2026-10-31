import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { fail } from "@/server/api/problem";
import { getStore } from "@/server/auth/session-store";
export function operationId(request: Request): string {
  return z.uuid().parse(request.headers.get("idempotency-key"));
}
export async function registerOperation(
  userId: string,
  path: string,
  id: string,
  body: string,
): Promise<void> {
  const fingerprint = createHash("sha256").update(body).digest("hex");
  const key = `operation:${userId}:${path}:${id}`;
  if (await getStore().setIfAbsent(key, fingerprint, 86400)) return;
  if ((await getStore().get(key)) !== fingerprint)
    fail(409, "This operation ID belongs to a different payload. Start a new action.");
}
