import { jointAngle, type Landmark } from "./joint-angles";
import type { DrillPreset } from "./drill-catalog";
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
  frames: number;
  alignedFrames: number;
  angles: Record<string, AngleStats>;
  flags: Set<string>;
}
export function createPracticeAggregate(): PracticeAggregate {
  return { frames: 0, alignedFrames: 0, angles: {}, flags: new Set() };
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
  return {
    drill_type: preset.id,
    sport: preset.sport,
    form_score: Number(((aggregate.alignedFrames / aggregate.frames) * 100).toFixed(2)),
    frames_analyzed: aggregate.frames,
    flaw_flags: [...aggregate.flags],
    joint_angles_summary: {
      policy: "practice-angle-v1",
      validated: false,
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
