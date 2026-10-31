import "server-only";
import { createHash } from "node:crypto";
import { getStore } from "@/server/auth/session-store";
import { fail } from "@/server/api/problem";
export async function rateLimit(
  identity: string,
  maximum: number,
  windowSeconds = 60,
): Promise<void> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = createHash("sha256").update(identity).digest("hex");
  if ((await getStore().increment(`rate:${key}:${bucket}`, windowSeconds + 1)) > maximum)
    fail(429, "Too many requests. Wait a moment before trying again.");
}
