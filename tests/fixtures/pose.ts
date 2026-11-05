import type { PoseFrame, PoseSubmission } from "../../src/contracts/drills";
import { practicePresets } from "../../src/features/drills/drill-catalog";
import { evaluatePoseSeries } from "../../src/features/drills/preset-evaluation";
export function calibratedSession(presetIndex = 0, timestamp = Date.now()): PoseSubmission {
  const preset = practicePresets[presetIndex]!;
  const jointIndexes = {
    elbow: [11, 13, 15],
    shoulder: [13, 11, 23],
    knee: [23, 25, 27],
    hip: [11, 23, 25],
  } as const;
  const frames: PoseFrame[] = Array.from({ length: 150 }, (_, index) => {
    const aligned = (index >= 30 && index < 60) || (index >= 90 && index < 120);
    const angle =
      ((aligned ? (preset.minimum + preset.maximum) / 2 : preset.joint === "hip" ? 170 : 20) *
        Math.PI) /
      180;
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
    const [a, b, c] = jointIndexes[preset.joint];
    landmarks[a] = { x: 0, y: 1, z: 0, visibility: 1 };
    landmarks[b] = { x: 0, y: 0, z: 0, visibility: 1 };
    landmarks[c] = {
      x: Number(Math.sin(angle).toFixed(4)),
      y: Number(Math.cos(angle).toFixed(4)),
      z: 0,
      visibility: 1,
    };
    return { timestamp: index * 100, landmarks };
  });
  const summary = evaluatePoseSeries(preset, frames, timestamp);
  if (!summary) throw new Error("Synthetic calibrated fixture did not produce a summary.");
  return { ...summary, pose_frames: frames };
}
