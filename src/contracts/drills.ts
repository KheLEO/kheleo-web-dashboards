import { z } from "zod";
import { jsonObjectSchema, uuidSchema } from "./common";
export const submitDrillSchema = z
  .object({
    athlete_id: uuidSchema.optional(),
    sport: z.string().min(1).max(50),
    drill_type: z.string().min(1).max(64),
    form_score: z.number().min(0).max(100),
    frames_analyzed: z.number().int().min(1),
    flaw_flags: z.union([z.array(z.string()), jsonObjectSchema]).optional(),
    joint_angles_summary: jsonObjectSchema.optional(),
    timestamp: z.number().finite().positive(),
  })
  .strict();
export const poseFrameSchema = z
  .object({
    timestamp: z.number().finite().nonnegative(),
    landmarks: z
      .array(
        z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
            z: z.number().finite(),
            visibility: z.number().min(0).max(1),
          })
          .strict(),
      )
      .length(33),
  })
  .strict();
export const poseSubmissionSchema = submitDrillSchema.extend({
  pose_frames: z.array(poseFrameSchema).min(30).max(300),
});
export type PoseFrame = z.infer<typeof poseFrameSchema>;
export type PoseSubmission = z.infer<typeof poseSubmissionSchema>;
export const drillResultSchema = z.object({
  success: z.boolean(),
  posture_points_awarded: z.number(),
  current_biomechanical_score: z.number(),
});
export type SubmitDrillRequest = z.infer<typeof submitDrillSchema>;
export type DrillSubmissionResult = z.infer<typeof drillResultSchema>;
