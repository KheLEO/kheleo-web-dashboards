"use client";
import { z } from "zod";
import { authUserSchema } from "@/contracts/auth";
import { browserClient } from "@/lib/api/browser-client";
import type { MutationOperation } from "@/lib/api/operation";
export const browserSessionSchema = z.object({
  user: authUserSchema,
  expiresAt: z.number(),
  capabilities: z.object({ safeEvents: z.boolean(), simulatorIngestion: z.boolean() }),
});
export type BrowserSession = z.infer<typeof browserSessionSchema>;
export async function authenticate(
  action: "login" | "register",
  operation: MutationOperation,
): Promise<BrowserSession> {
  const response = await browserClient.post<unknown>(`/session/${action}`, operation.body, {
    headers: { "Idempotency-Key": operation.id, "Content-Type": "application/json" },
  });
  return browserSessionSchema.parse(response.data);
}
export async function getSession(): Promise<BrowserSession> {
  return browserSessionSchema.parse((await browserClient.get<unknown>("/session/me")).data);
}
