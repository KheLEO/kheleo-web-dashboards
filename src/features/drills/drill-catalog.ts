import { calibratedDrillReferences } from "./scoring-policy";
import type { SportType } from "@/contracts/enums.generated";
export interface DrillPreset {
  id: string;
  name: string;
  sport: SportType;
  description: string;
  joint: "elbow" | "shoulder" | "knee" | "hip";
  minimum: number;
  maximum: number;
  flag: string;
}
export const practicePresets: readonly DrillPreset[] = [
  {
    id: "CRICKET_BOWLING",
    sport: "CRICKET",
    name: "Cricket bowling",
    description:
      "Practice elbow-extension alignment. This does not determine bowling legality or release timing.",
    joint: "elbow",
    minimum: calibratedDrillReferences.CRICKET_BOWLING.window.minAngle,
    maximum: calibratedDrillReferences.CRICKET_BOWLING.window.maxAngle,
    flag: "ELBOW_ANGLE_OUT_OF_RANGE",
  },
  {
    id: "BADMINTON_SMASH",
    sport: "BADMINTON",
    name: "Badminton smash",
    description: "Explore overhead shoulder alignment; contact timing is not inferred.",
    joint: "shoulder",
    minimum: calibratedDrillReferences.BADMINTON_SMASH.window.minAngle,
    maximum: calibratedDrillReferences.BADMINTON_SMASH.window.maxAngle,
    flag: "SHOULDER_ANGLE_OUT_OF_RANGE",
  },
  {
    id: "FOOTBALL_STRIKE",
    sport: "FOOTBALL",
    name: "Football strike",
    description: "Practice knee-extension alignment without inferring ball contact or power.",
    joint: "knee",
    minimum: calibratedDrillReferences.FOOTBALL_STRIKE.window.minAngle,
    maximum: calibratedDrillReferences.FOOTBALL_STRIKE.window.maxAngle,
    flag: "KNEE_ANGLE_OUT_OF_RANGE",
  },
  {
    id: "ATHLETICS_SPRINT_START",
    sport: "ATHLETICS",
    name: "Athletics sprint start",
    description: "Practice hip flexion through repeated sprint-start movements.",
    joint: "hip",
    minimum: calibratedDrillReferences.ATHLETICS_SPRINT_START.window.minAngle,
    maximum: calibratedDrillReferences.ATHLETICS_SPRINT_START.window.maxAngle,
    flag: "HIP_ANGLE_OUT_OF_RANGE",
  },
];
export const drillCatalog = [
  {
    id: "movement-check",
    name: "Full-body movement check",
    description: "View skeletal tracking and joint angles. No performance score is assigned.",
  },
  ...practicePresets,
];
