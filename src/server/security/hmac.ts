import "server-only";
import { canonicalJson } from "@/lib/canonical-json";
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
  return canonicalJson({
    athlete_id: userId,
    sport: body.sport,
    drill_type: body.drill_type,
    form_score: body.form_score,
    frames_analyzed: body.frames_analyzed,
    flaw_flags: body.flaw_flags ?? [],
    joint_angles_summary: body.joint_angles_summary ?? {},
    timestamp: body.timestamp,
  });
}
