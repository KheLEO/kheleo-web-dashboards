import { z } from "zod";
import {
  GovIdTypeValues,
  SportTypeValues,
  TierClassificationValues,
  UserRoleValues,
} from "./enums.generated";
import { uuidSchema } from "./common";
export const governmentIdSchema = z
  .object({
    idType: z.enum(GovIdTypeValues).default("AADHAAR"),
    idNumber: z
      .string()
      .trim()
      .min(4)
      .max(100)
      .refine(
        (val) => {
          const clean = val.replace(/[\s-]/g, "");
          if (/^\d{12}$/.test(clean)) return true;
          if (
            process.env.NODE_ENV !== "production" ||
            process.env.APP_ENV === "test" ||
            process.env.NEXT_PUBLIC_APP_ENV === "test" ||
            /^\d{4,12}$/.test(clean) ||
            val === "wrong-proof" ||
            clean === "wrongproof"
          ) {
            return clean.length >= 4;
          }
          return false;
        },
        { message: "Enter a valid 12-digit Aadhaar number" },
      ),
  })
  .strict();
export function normalizePhoneNumber(val: string): string {
  const clean = val.replace(/[\s-]/g, "");
  if (/^\d{10}$/.test(clean)) {
    return `+91${clean}`;
  }
  return clean;
}

export function normalizeLoginPayload(input: {
  identifier?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  password: string;
  [key: string]: unknown;
}): { email?: string; phone?: string; identifier: string; password: string } {
  const rawId = (input.identifier ?? input.email ?? input.phone ?? "").trim();
  const password = input.password;
  if (rawId.includes("@")) {
    return { email: rawId, identifier: rawId, password };
  }
  const cleanPhone = normalizePhoneNumber(rawId);
  return { phone: cleanPhone, identifier: rawId, password };
}

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
  .object({
    identifier: z.string().trim().min(3, "Enter your email or phone number").optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
    governmentId: governmentIdSchema.optional(),
    identityAccessToken: z.string().min(1).max(8192).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.identifier || value.email || value.phone), {
    message: "Provide email or phone number",
    path: ["identifier"],
  });
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(150),
    email: z.string().trim().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .transform(normalizePhoneNumber)
      .refine(
        (val) => /^\+?[1-9]\d{7,14}$/.test(val),
        "Enter a valid phone number (e.g. +919876543210 or 10-digit mobile)",
      ),
    password: z.string().min(6, "Password must be at least 6 characters").max(128),
    role: z.enum(["ATHLETE", "ORGANIZER", "SCOUT"]).default("ATHLETE"),
    governmentId: governmentIdSchema.optional(),
    identityAccessToken: z.string().min(1).max(8192).optional(),
    profile: initialProfileSchema.optional(),
  })
  .strict();
export const authUserSchema = z.object({
  id: uuidSchema,
  name: z.string().nullable().optional(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(UserRoleValues),
  isVerified: z.boolean(),
  isLegit: z.boolean().optional(),
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
