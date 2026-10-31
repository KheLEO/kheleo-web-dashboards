import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registerSchema, loginSchema } from "@/contracts/auth";
import { envelope } from "@/lib/api/response-decoders";
import { scoutFeedSchema } from "@/contracts/scouting";
import { createOperation, sameOperation } from "@/lib/api/operation";
import { workspaceRoles, homeForRole } from "@/server/auth/permissions";
import { MemoryStore } from "@/server/auth/session-store";

describe("identity and contracts", () => {
  it("rejects public privileged registration", () => {
    expect(registerSchema.safeParse({ email: "a@example.com", role: "SUPER_ADMIN" }).success).toBe(
      false,
    );
  });
  it("requires Gov-ID proof and a contact for login", () => {
    expect(loginSchema.safeParse({ email: "a@example.com" }).success).toBe(false);
    expect(
      loginSchema.safeParse({ governmentId: { idType: "AADHAAR", idNumber: "123456" } }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "a@example.com",
        governmentId: { idType: "AADHAAR", idNumber: "123456" },
      }).success,
    ).toBe(true);
  });
  it("unwraps only the declared envelope layer", () => {
    const body = { success: true, timestamp: "now", data: { data: [1], count: 1 } };
    expect(
      envelope(z.object({ data: z.array(z.number()), count: z.number() })).parse(body),
    ).toEqual(body.data);
  });
  it("accepts the bare scout feed and rejects a fabricated envelope", () => {
    const feed = { success: true, total: 0, limit: 20, next_cursor: null, data: [] };
    expect(scoutFeedSchema.parse(feed)).toEqual(feed);
    expect(scoutFeedSchema.safeParse({ success: true, data: feed, timestamp: "now" }).success).toBe(
      false,
    );
  });
  it("keeps one UUID and exact body for retries, creates another for edited input", () => {
    const input = { primary_role: "BOWLER" };
    const operation = createOperation(input);
    expect(sameOperation(operation, input)).toBe(operation);
    expect(sameOperation(operation, { primary_role: "BATSMAN" }).id).not.toBe(operation.id);
  });
  it("does not grant organizer scout access", () => {
    expect(workspaceRoles.scout).not.toContain("ORGANIZER");
    expect(homeForRole("UMPIRE")).toBe("/unsupported");
  });
});
describe("local store lock semantics", () => {
  it("allows exactly one competing lock owner", async () => {
    const store = new MemoryStore();
    const locks = await Promise.all(
      Array.from({ length: 20 }, (_, index) => store.setIfAbsent("lock", String(index), 30)),
    );
    expect(locks.filter(Boolean)).toHaveLength(1);
  });
  it("does not release another owner's lock", async () => {
    const store = new MemoryStore();
    await store.setIfAbsent("lock", "owner", 30);
    await store.release("lock", "intruder");
    expect(await store.get("lock")).toBe("owner");
    await store.release("lock", "owner");
    expect(await store.get("lock")).toBeNull();
  });
  it("increments concurrently without losing counts", async () => {
    const store = new MemoryStore();
    await Promise.all(Array.from({ length: 20 }, () => store.increment("rate", 60)));
    expect(await store.get("rate")).toBe("20");
  });
});
