import { jointAngle, type Landmark } from "./joint-angles";
import type { DrillPreset } from "./drill-catalog";
import { calibratedDrillReferences, type CalibratedDrillType } from "./scoring-policy";
import { canonicalJson } from "@/lib/canonical-json";
import type { PoseFrame } from "@/contracts/drills";
import type { SubmitDrillRequest } from "@/contracts/drills";
export interface FrameEvaluation {
  angles: Record<string, number>;
  flags: string[];
  aligned: boolean;
}
export interface AngleStats {
  samples: number;
  sum: number;
  min: number;
  max: number;
}
export interface PracticeAggregate {
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  repetitions: number;
  wasAligned: boolean | null;
  cadenceValid: boolean;
  frames: number;
  alignedFrames: number;
  angles: Record<string, AngleStats>;
  flags: Set<string>;
}
export function createPracticeAggregate(): PracticeAggregate {
  return {
    frames: 0,
    alignedFrames: 0,
    angles: {},
    flags: new Set(),
    firstTimestamp: null,
    lastTimestamp: null,
    repetitions: 0,
    wasAligned: null,
    cadenceValid: true,
  };
}
const joints = {
  elbow: [
    [11, 13, 15],
    [12, 14, 16],
  ],
  shoulder: [
    [13, 11, 23],
    [14, 12, 24],
  ],
  hip: [
    [11, 23, 25],
    [12, 24, 26],
  ],
  knee: [
    [23, 25, 27],
    [24, 26, 28],
  ],
} as const;
export function evaluatePracticeFrame(
  preset: DrillPreset,
  points: Landmark[],
): FrameEvaluation | null {
  if (
    points.length !== 33 ||
    [11, 12, 23, 24, 25, 26, 27, 28].some((index) => {
      const point = points[index];
      return (
        !point ||
        !Number.isFinite(point.visibility) ||
        point.visibility < 0.6 ||
        ![point.x, point.y, point.z].every(Number.isFinite)
      );
    })
  )
    return null;
  const angles: Record<string, number> = {};
  for (const [joint, sides] of Object.entries(joints))
    for (const [side, indexes] of sides.entries()) {
      const a = points[indexes[0]],
        b = points[indexes[1]],
        c = points[indexes[2]];
      if (a && b && c) {
        const value = jointAngle(a, b, c);
        if (value !== null) angles[`${side === 0 ? "left" : "right"}_${joint}`] = value;
      }
    }
  const targets = [angles[`left_${preset.joint}`], angles[`right_${preset.joint}`]].filter(
    (value): value is number => value !== undefined,
  );
  if (!targets.length) return null;
  const aligned = targets.some((value) => value >= preset.minimum && value <= preset.maximum);
  return { angles, aligned, flags: [aligned ? "OPTIMAL_BIOMECHANICAL_ALIGNMENT" : preset.flag] };
}
export function accumulatePractice(
  current: PracticeAggregate,
  frame: FrameEvaluation,
  timestamp?: number,
): PracticeAggregate {
  const angles = { ...current.angles };
  for (const [name, value] of Object.entries(frame.angles)) {
    const previous = angles[name];
    angles[name] = previous
      ? {
          samples: previous.samples + 1,
          sum: previous.sum + value,
          min: Math.min(previous.min, value),
          max: Math.max(previous.max, value),
        }
      : { samples: 1, sum: value, min: value, max: value };
  }
  return {
    firstTimestamp: current.firstTimestamp ?? timestamp ?? null,
    lastTimestamp: timestamp ?? null,
    repetitions: current.repetitions + Number(current.wasAligned === false && frame.aligned),
    wasAligned: frame.aligned,
    cadenceValid:
      current.cadenceValid &&
      (timestamp === undefined ||
        current.lastTimestamp === null ||
        (timestamp > current.lastTimestamp && timestamp - current.lastTimestamp <= 500)),
    frames: current.frames + 1,
    alignedFrames: current.alignedFrames + Number(frame.aligned),
    angles,
    flags: new Set([
      ...current.flags,
      ...frame.flags.filter((flag) => flag !== "OPTIMAL_BIOMECHANICAL_ALIGNMENT"),
    ]),
  };
}
export function practiceSummary(
  preset: DrillPreset,
  aggregate: PracticeAggregate,
  timestamp: number,
): SubmitDrillRequest | null {
  if (!aggregate.frames) return null;
  const reference = calibratedDrillReferences[preset.id as CalibratedDrillType];
  if (!reference || reference.sport !== preset.sport) return null;
  const duration =
    aggregate.firstTimestamp !== null && aggregate.lastTimestamp !== null
      ? aggregate.lastTimestamp - aggregate.firstTimestamp
      : 0;
  const cadence = duration > 0 ? (aggregate.repetitions * 60000) / duration : 0;
  const validated =
    aggregate.frames >= reference.window.minValidFrames &&
    aggregate.repetitions >= 2 &&
    aggregate.cadenceValid &&
    duration >= 2000 &&
    cadence >= reference.window.cadenceMinRpm &&
    cadence <= reference.window.cadenceMaxRpm;
  return {
    drill_type: preset.id,
    sport: preset.sport,
    form_score: Number(((aggregate.alignedFrames / aggregate.frames) * 100).toFixed(2)),
    frames_analyzed: aggregate.frames,
    flaw_flags: [...aggregate.flags],
    joint_angles_summary: {
      policy: "calibrated-angle-v1",
      calibrationVersion: reference.calibrationVersion,
      validated,
      repetitions: aggregate.repetitions,
      duration_ms: duration,
      cadence_rpm: Number(cadence.toFixed(2)),
      ...Object.fromEntries(
        Object.entries(aggregate.angles).map(([name, value]) => [
          name,
          {
            samples: value.samples,
            min: Number(value.min.toFixed(2)),
            max: Number(value.max.toFixed(2)),
            mean: Number((value.sum / value.samples).toFixed(2)),
          },
        ]),
      ),
    },
    timestamp,
  };
}

export async function computePoseDigest(frames: readonly PoseFrame[]): Promise<string> {
  const canonical = canonicalJson(frames);
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function evaluatePoseSeries(
  preset: DrillPreset,
  frames: readonly PoseFrame[],
  timestamp: number,
): SubmitDrillRequest | null {
  const aggregate = frames.reduce((current, frame) => {
    const evaluation = evaluatePracticeFrame(preset, frame.landmarks);
    return evaluation ? accumulatePractice(current, evaluation, frame.timestamp) : current;
  }, createPracticeAggregate());
  const summary = practiceSummary(preset, aggregate, timestamp);
  return summary && summary.frames_analyzed === frames.length ? summary : null;
}
