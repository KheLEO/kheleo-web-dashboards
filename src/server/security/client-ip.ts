import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** Select from the trusted proxy suffix, never a caller-prepended forwarding chain. */
export function forwardedClientIp(
  headers: Pick<Headers, "get">,
  trustedHops: number,
): string | null {
  if (!Number.isInteger(trustedHops) || trustedHops < 1 || trustedHops > 10) return null;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded.split(",").map((part) => part.trim());
    const suffix = chain.slice(-trustedHops);
    return suffix.length === trustedHops && suffix.every((ip) => isIP(ip)) ? suffix[0]! : null;
  }
  const real = headers.get("x-real-ip")?.trim();
  return trustedHops === 1 && real && isIP(real) ? real : null;
}

export function clientIpHeaders(
  ip: string,
  secret?: string,
  now = Date.now(),
): Record<string, string> {
  if (!isIP(ip)) return {};
  const headers: Record<string, string> = { "X-Forwarded-For": ip, "X-Real-IP": ip };
  if (secret) {
    const timestamp = String(now);
    const key = createHmac("sha256", secret).update("kheleo/bff-client-ip/v1").digest();
    headers["X-Kheleo-Client-IP"] = ip;
    headers["X-Kheleo-Client-Timestamp"] = timestamp;
    headers["X-Kheleo-Client-Signature"] = createHmac("sha256", key)
      .update(`${timestamp}\n${ip}`)
      .digest("hex");
  }
  return headers;
}
