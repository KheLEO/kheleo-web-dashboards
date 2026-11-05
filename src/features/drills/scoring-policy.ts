import type { SportType } from "@/contracts/enums.generated";

export interface BiomechanicalReferenceWindow {
  readonly joint: "elbow" | "shoulder" | "knee" | "hip";
  readonly minAngle: number;
  readonly maxAngle: number;
  readonly cadenceMinRpm: number;
  readonly cadenceMaxRpm: number;
  readonly minValidFrames: number;
}
export interface CalibratedDrillReference {
  readonly sport: SportType;
  readonly calibrationVersion: "1.0.0";
  readonly window: BiomechanicalReferenceWindow;
}
export const calibratedDrillReferences = {
  CRICKET_BOWLING: {
    sport: "CRICKET",
    calibrationVersion: "1.0.0",
    window: {
      joint: "elbow",
      minAngle: 150,
      maxAngle: 180,
      cadenceMinRpm: 6,
      cadenceMaxRpm: 30,
      minValidFrames: 30,
    },
  },
  BADMINTON_SMASH: {
    sport: "BADMINTON",
    calibrationVersion: "1.0.0",
    window: {
      joint: "shoulder",
      minAngle: 135,
      maxAngle: 180,
      cadenceMinRpm: 8,
      cadenceMaxRpm: 40,
      minValidFrames: 30,
    },
  },
  FOOTBALL_STRIKE: {
    sport: "FOOTBALL",
    calibrationVersion: "1.0.0",
    window: {
      joint: "knee",
      minAngle: 145,
      maxAngle: 180,
      cadenceMinRpm: 4,
      cadenceMaxRpm: 25,
      minValidFrames: 30,
    },
  },
  ATHLETICS_SPRINT_START: {
    sport: "ATHLETICS",
    calibrationVersion: "1.0.0",
    window: {
      joint: "hip",
      minAngle: 45,
      maxAngle: 100,
      cadenceMinRpm: 3,
      cadenceMaxRpm: 20,
      minValidFrames: 30,
    },
  },
} as const satisfies Record<string, CalibratedDrillReference>;
export type CalibratedDrillType = keyof typeof calibratedDrillReferences;
export const scoringPolicy = {
  approved: true,
  calibrationVersion: "1.0.0",
  minVisibility: 0.6,
  maxPoseFrames: 300,
  reason:
    "Scoring policy 1.0.0 checks joint angles, movement cadence, and at least 30 visible pose frames before awarding points.",
} as const;
