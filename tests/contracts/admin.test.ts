import { describe, expect, it } from "vitest";
import {
  adminUsersQuerySchema,
  governanceSchema,
  moderationSchema,
  auditQuerySchema,
  securityAuditSchema,
  queueHealthSchema,
} from "@/contracts/admin";
import { ids } from "@/test/factories";
describe("administrative contracts", () => {
  it("preserves false-valued directory filters and rejects forged governance actors", () => {
    expect(adminUsersQuerySchema.parse({ isActive: "false", role: "ORGANIZER" })).toMatchObject({
      isActive: false,
      role: "ORGANIZER",
    });
    expect(adminUsersQuerySchema.safeParse({ isActive: "0" }).success).toBe(false);
    expect(governanceSchema.parse({ isActive: false })).toEqual({ isActive: false });
    expect(governanceSchema.safeParse({}).success).toBe(false);
    expect(
      governanceSchema.safeParse({ verificationStatus: "VERIFIED", actorUserId: ids.athlete })
        .success,
    ).toBe(false);
  });
  it("validates moderation state and exact audit category/severity selectors", () => {
    expect(moderationSchema.safeParse({ featured: false }).success).toBe(true);
    expect(moderationSchema.safeParse({ suspended: true, status: "IN_PROGRESS" }).success).toBe(
      false,
    );
    expect(moderationSchema.safeParse({}).success).toBe(false);
    expect(
      auditQuerySchema.parse({ category: "DRILL_HMAC_TAMPER", severity: "CRITICAL" }),
    ).toMatchObject({ category: "DRILL_HMAC_TAMPER", severity: "CRITICAL" });
    expect(auditQuerySchema.safeParse({ category: "SUCCESSFUL_HMAC_TAMPER" }).success).toBe(false);
  });
  it("requires immutable audit identity and distinguishes failed probes from measured zero latency", () => {
    const event = {
      id: ids.alert,
      category: "GOV_ID_RESET",
      severity: "WARNING",
      actorUserId: null,
      targetId: ids.athlete,
      summary: "Duplicate identity blocked",
      metadata: { outcome: "BLOCKED" },
      ipHash: null,
      createdAt: "2026-11-06T00:00:00Z",
    };
    expect(securityAuditSchema.safeParse(event).success).toBe(true);
    expect(securityAuditSchema.safeParse({ ...event, ipHash: "127.0.0.1" }).success).toBe(false);
    expect(
      queueHealthSchema.parse({
        name: "gti-calculation",
        status: "unreachable",
        latencyMs: null,
        waiting: null,
        active: null,
        delayed: null,
        failed: null,
        completed: null,
      }).latencyMs,
    ).toBeNull();
    expect(
      queueHealthSchema.parse({
        name: "gti-calculation",
        status: "ok",
        latencyMs: 0,
        waiting: 0,
        active: 0,
        delayed: 0,
        failed: 0,
        completed: 0,
      }).latencyMs,
    ).toBe(0);
  });
});
