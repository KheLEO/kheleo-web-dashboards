import { describe, expect, it } from "vitest";
import { practicePresets } from "@/features/drills/drill-catalog";
import {
  accumulatePractice,
  createPracticeAggregate,
  evaluatePracticeFrame,
  practiceSummary,
} from "@/features/drills/preset-evaluation";
import type { Landmark } from "@/features/drills/joint-angles";
import { ApiError } from "@/lib/api/errors";
import { simulatedReading } from "@/features/wearables/simulator-source.client";
import { classifyVitals } from "@/contracts/safety";
function elbowPose(bent: boolean): Landmark[] {
  const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  points[11] = { x: 0, y: 0, z: 0, visibility: 1 };
  points[13] = { x: 1, y: 0, z: 0, visibility: 1 };
  points[15] = { x: bent ? 1 : 2, y: bent ? 1 : 0, z: 0, visibility: 1 };
  return points;
}
describe("athlete practice summaries", () => {
  it("defines exactly the four requested sport presets", () => {
    expect(practicePresets.map((preset) => preset.id)).toEqual([
      "CRICKET_BOWLING",
      "BADMINTON_SMASH",
      "FOOTBALL_STRIKE",
      "ATHLETICS_SPRINT_START",
    ]);
  });
  it("produces real angle feedback and a clearly unvalidated aggregate without frames", () => {
    const preset = practicePresets[0]!;
    const good = evaluatePracticeFrame(preset, elbowPose(false));
    const bad = evaluatePracticeFrame(preset, elbowPose(true));
    expect(good?.angles.left_elbow).toBeCloseTo(180);
    expect(good?.flags).toContain("OPTIMAL_BIOMECHANICAL_ALIGNMENT");
    expect(bad?.angles.left_elbow).toBeCloseTo(90);
    expect(bad?.flags).toContain("ELBOW_ANGLE_OUT_OF_RANGE");
    const summary = practiceSummary(
      preset,
      accumulatePractice(accumulatePractice(createPracticeAggregate(), good!), bad!),
      1700000000000,
    );
    expect(summary).toMatchObject({
      drill_type: "CRICKET_BOWLING",
      sport: "CRICKET",
      form_score: 50,
      frames_analyzed: 2,
      flaw_flags: ["ELBOW_ANGLE_OUT_OF_RANGE"],
      timestamp: 1700000000000,
      joint_angles_summary: { policy: "practice-angle-v1", validated: false },
    });
    expect(summary).not.toHaveProperty("video");
    expect(summary).not.toHaveProperty("landmarks");
  });
  it("does not create summaries from empty or invisible joint data", () => {
    const preset = practicePresets[0]!;
    expect(practiceSummary(preset, createPracticeAggregate(), 1)).toBeNull();
    const points = elbowPose(false).map((point) => ({ ...point, visibility: 0.2 }));
    expect(evaluatePracticeFrame(preset, points)).toBeNull();
  });
  it("keeps capacity and below-tier conflicts distinct from sandbagging", () => {
    const problem = {
      type: "about:blank",
      title: "Conflict",
      detail: "Full",
      status: 409,
      instance: "",
      timestamp: "now",
    };
    expect(new ApiError(problem).isSandbaggingDetected).toBe(false);
    expect(new ApiError({ ...problem, code: "BELOW_MINIMUM_TIER" }).isSandbaggingDetected).toBe(
      false,
    );
    expect(new ApiError({ ...problem, code: "SANDBAGGING_DETECTED" }).isSandbaggingDetected).toBe(
      true,
    );
  });
  it.each(["heat-exhaustion", "cardiac-strain"] as const)(
    "simulates critical %s vitals without labeling them hardware",
    (scenario) => {
      const reading = simulatedReading(scenario, 0, 10);
      expect(reading.source).toBe("simulator");
      expect(
        classifyVitals({
          heart_rate: reading.heartRate,
          spo2: reading.spo2!,
          skin_temperature: reading.skinTemperature!,
        }),
      ).toBe("CRITICAL");
    },
  );
});
