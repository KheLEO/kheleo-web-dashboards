import "server-only";
import type { SubmitDrillRequest } from "@/contracts/drills";
export async function signHmac(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const result = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export function drillSigningPayload(userId: string, body: SubmitDrillRequest): string {
  return `${userId}:${body.drill_type}:${body.form_score}:${body.timestamp}`;
}
