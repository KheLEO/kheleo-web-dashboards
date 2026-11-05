import "server-only";
import { practicePresets } from "@/features/drills/drill-catalog";
import { computePoseDigest, evaluatePoseSeries } from "@/features/drills/preset-evaluation";
import { poseSubmissionSchema, submitDrillSchema } from "@/contracts/drills";
import { drillSigningPayload, signHmac } from "@/server/security/hmac";
import { getEnvironment } from "@/server/env";
import { fail } from "./problem";
export async function prepareDrill(
  userId: string,
  input: unknown,
  poseDigest?: string | null,
): Promise<{ body: string; signature: { name: string; value: string } }> {
  const { pose_frames: frames, ...body } = poseSubmissionSchema.parse(input);
  if (body.athlete_id && body.athlete_id !== userId)
    fail(403, "Drill identity must match your account.");
  if (Math.abs(Date.now() - body.timestamp) > 300000)
    fail(403, "The drill submission has expired. Start a new action.");
  const preset = practicePresets.find(
    (entry) => entry.id === body.drill_type && entry.sport === body.sport,
  );
  if (!preset) fail(400, "Choose a supported sport drill preset.");
  if (
    !poseDigest ||
    !/^[a-f\d]{64}$/.test(poseDigest) ||
    poseDigest !== (await computePoseDigest(frames))
  )
    fail(403, "The pose series digest is missing or does not match.");
  const evaluated = evaluatePoseSeries(preset, frames, body.timestamp);
  if (!evaluated || evaluated.joint_angles_summary?.validated !== true)
    fail(
      422,
      "Record at least 30 visible frames and two movements within the preset cadence window.",
      "INVALID_CALIBRATED_SESSION",
    );
  if (drillSigningPayload(userId, body) !== drillSigningPayload(userId, evaluated))
    fail(403, "Drill scores must match the evaluated pose series.");
  return signDrillForRelay(userId, {
    ...evaluated,
    joint_angles_summary: { ...evaluated.joint_angles_summary, client_pose_digest: poseDigest },
  });
}
export async function signDrillForRelay(
  userId: string,
  input: unknown,
): Promise<{ body: string; signature: { name: string; value: string } }> {
  const body = { ...submitDrillSchema.parse(input), athlete_id: userId };
  const secret = getEnvironment().DRILL_HMAC_SECRET;
  if (!secret) fail(503, "Drill signing is not configured.");
  return {
    body: JSON.stringify(body),
    signature: {
      name: "x-drill-signature",
      value: await signHmac(secret, drillSigningPayload(userId, body)),
    },
  };
}
