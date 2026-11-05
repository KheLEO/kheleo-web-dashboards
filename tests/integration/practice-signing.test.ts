// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHmac, createHash } from "node:crypto";
import { prepareDrill } from "@/server/api/drill-relay";
import { drillSigningPayload } from "@/server/security/hmac";
import { canonicalJson } from "@/lib/canonical-json";
import { computePoseDigest } from "@/features/drills/preset-evaluation";
import { ids } from "@/test/factories";
import { calibratedSession } from "../fixtures/pose";
beforeEach(() => {
  vi.stubEnv("SESSION_STORE", "memory");
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("DRILL_HMAC_SECRET", "test-only-hmac-secret");
});
afterEach(() => vi.unstubAllEnvs());
it.each([0, 1, 2, 3])(
  "validates preset %s and signs every canonical backend field with FULL_V2",
  async (index) => {
    const submission = calibratedSession(index);
    const digest = await computePoseDigest(submission.pose_frames);
    expect(digest).toBe(
      createHash("sha256").update(canonicalJson(submission.pose_frames)).digest("hex"),
    );
    const result = await prepareDrill(ids.athlete, submission, digest);
    const body: unknown = JSON.parse(result.body);
    expect(result.signature.value).toBe(
      createHmac("sha256", "test-only-hmac-secret")
        .update(drillSigningPayload(ids.athlete, JSON.parse(result.body) as typeof submission))
        .digest("hex"),
    );
    expect(body).toMatchObject({
      athlete_id: ids.athlete,
      joint_angles_summary: {
        calibrationVersion: "1.0.0",
        validated: true,
        client_pose_digest: digest,
      },
    });
    expect(body).not.toHaveProperty("pose_frames");
  },
);
it("allows valid calibrated sessions in production with server secrets", async () => {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("SESSION_STORE", "redis");
  vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  const submission = calibratedSession();
  await expect(
    prepareDrill(ids.athlete, submission, await computePoseDigest(submission.pose_frames)),
  ).resolves.toHaveProperty("signature");
});
it("requires a supported sport/preset pair", async () => {
  await expect(
    prepareDrill(ids.athlete, { ...calibratedSession(), sport: "FOOTBALL" }),
  ).rejects.toMatchObject({ problem: { status: 400 } });
});
it.each(["form_score", "frames_analyzed", "flaw_flags", "joint_angles_summary"] as const)(
  "rejects tampered %s",
  async (field) => {
    const submission = calibratedSession();
    const digest = await computePoseDigest(submission.pose_frames);
    const tampered = {
      ...submission,
      [field]:
        field === "form_score"
          ? 100
          : field === "frames_analyzed"
            ? 149
            : field === "flaw_flags"
              ? []
              : { validated: true },
    };
    await expect(prepareDrill(ids.athlete, tampered, digest)).rejects.toMatchObject({
      problem: { status: 403 },
    });
  },
);
it("rejects altered poses and missing digests", async () => {
  const submission = calibratedSession();
  await expect(prepareDrill(ids.athlete, submission)).rejects.toMatchObject({
    problem: { status: 403 },
  });
  await expect(prepareDrill(ids.athlete, submission, "0".repeat(64))).rejects.toMatchObject({
    problem: { status: 403 },
  });
});
it("rejects static poses, insufficient visible frames, and invalid cadence", async () => {
  for (const kind of ["static", "visibility", "cadence"] as const) {
    const submission = calibratedSession();
    if (kind === "static")
      submission.pose_frames = submission.pose_frames.map((frame) => ({
        ...frame,
        landmarks: submission.pose_frames[0]!.landmarks,
      }));
    if (kind === "visibility")
      submission.pose_frames = submission.pose_frames.map((frame) => ({
        ...frame,
        landmarks: frame.landmarks.map((point) => ({ ...point, visibility: 0.2 })),
      }));
    if (kind === "cadence")
      submission.pose_frames = submission.pose_frames.map((frame) => ({
        ...frame,
        timestamp: frame.timestamp / 10,
      }));
    await expect(
      prepareDrill(ids.athlete, submission, await computePoseDigest(submission.pose_frames)),
    ).rejects.toMatchObject({ problem: { status: 422, code: "INVALID_CALIBRATED_SESSION" } });
  }
  const submission = calibratedSession();
  await expect(
    prepareDrill(ids.athlete, { ...submission, pose_frames: submission.pose_frames.slice(0, 29) }),
  ).rejects.toHaveProperty("name", "ZodError");
});
