import { z } from "zod";
import {
  GovIdTypeValues,
  SportTypeValues,
  TierClassificationValues,
  UserRoleValues,
} from "./enums.generated";
import { uuidSchema } from "./common";
export const governmentIdSchema = z
  .object({ idType: z.enum(GovIdTypeValues), idNumber: z.string().trim().min(4).max(100) })
  .strict();
const contact = {
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/)
    .optional(),
  email: z.email().optional(),
};
export const initialProfileSchema = z
  .object({
    dateOfBirth: z.iso.date(),
    gender: z.string().min(1).max(16),
    primarySport: z.enum(SportTypeValues),
    secondarySports: z.array(z.enum(SportTypeValues)).optional(),
    district: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    tierClassification: z.enum(TierClassificationValues).optional(),
    heightCm: z.number().min(50).max(260).optional(),
    weightKg: z.number().min(20).max(200).optional(),
    dominantSide: z.string().max(16).optional(),
  })
  .strict();
export const loginSchema = z
  .object({ ...contact, governmentId: governmentIdSchema })
  .strict()
  .refine((value) => Boolean(value.phone || value.email), {
    message: "Provide phone or email",
    path: ["email"],
  });
export const registerSchema = z
  .object({
    ...contact,
    role: z.literal("ATHLETE").optional(),
    governmentId: governmentIdSchema.optional(),
    profile: initialProfileSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.phone || value.email), {
    message: "Provide phone or email",
    path: ["email"],
  });
export const authUserSchema = z.object({
  id: uuidSchema,
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(UserRoleValues),
  isVerified: z.boolean(),
  athleteProfileId: uuidSchema.nullable(),
});
export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.string(),
  expiresIn: z.number().positive(),
  user: authUserSchema,
});
export const tokenIdentitySchema = z.object({
  sub: uuidSchema,
  role: z.enum(UserRoleValues),
  email: z.string().optional(),
  phone: z.string().optional(),
});
export const verificationSchema = z.object({
  message: z.string(),
  verified: z.boolean(),
  idHashPrefix: z.string(),
});
export type GovernmentIdInput = z.infer<typeof governmentIdSchema>;
export type InitialAthleteProfile = z.infer<typeof initialProfileSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type AuthUserSummary = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type TokenIdentity = z.infer<typeof tokenIdentitySchema>;
export type VerificationResponse = z.infer<typeof verificationSchema>;
export interface RefreshRequest {
  refreshToken: string;
}
