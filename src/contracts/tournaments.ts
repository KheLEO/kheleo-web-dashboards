import { competitionConfigSchema } from "./organizer";
import { z } from "zod";
import {
  BracketTypeValues,
  RegistrationStatusValues,
  SportTypeValues,
  TournamentStatusValues,
} from "./enums.generated";
import { dateSchema, decimalSchema, jsonSchema, uuidSchema } from "./common";
export const nearbyQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius_km: z.coerce.number().int().min(1).max(1000).optional(),
    sport: z.enum(SportTypeValues).optional(),
    cursor: uuidSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
export const tournamentLocationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  sport: z.string(),
  status: z.string(),
  minGti: z.number(),
  maxGti: z.number(),
  venueName: z.string(),
  venueLat: z.number(),
  venueLng: z.number(),
  distanceKm: z.number(),
  startDate: dateSchema,
  registrationDeadline: dateSchema,
  prizePool: z.number().optional(),
  maxTeams: z.number().optional(),
  teamSize: z.number().optional(),
});
export const createTournamentSchema = z
  .object({
    rulesConfig: competitionConfigSchema.optional(),
    status: z.enum(TournamentStatusValues).optional(),
    name: z.string().trim().min(1).max(255),
    sport: z.enum(SportTypeValues),
    minGti: z.number().min(0).max(100).optional(),
    maxGti: z.number().min(0).max(100).optional(),
    maxTeams: z.number().int().min(2),
    teamSize: z.number().int().min(1).max(30),
    prizePool: z.number().min(0).optional(),
    venueName: z.string().trim().min(1).max(255),
    venueLat: z.number().min(-90).max(90),
    venueLng: z.number().min(-180).max(180),
    registrationDeadline: dateSchema,
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .strict()
  .refine((v) => (v.minGti ?? 0) <= (v.maxGti ?? 100), {
    message: "Minimum GTI cannot exceed maximum",
    path: ["maxGti"],
  })
  .refine(
    (v) =>
      Date.parse(v.registrationDeadline) <= Date.parse(v.startDate) &&
      Date.parse(v.startDate) <= Date.parse(v.endDate),
    { message: "Registration deadline, start, and end must be chronological", path: ["endDate"] },
  )
  .refine(
    (value) =>
      !value.rulesConfig?.roleQuotas ||
      Object.values(value.rulesConfig.roleQuotas).reduce((sum, count) => sum + count, 0) ===
        value.teamSize,
    { message: "Role quota total must equal team size", path: ["rulesConfig", "roleQuotas"] },
  )
  .refine(
    (value) =>
      !value.rulesConfig?.prizeBreakdown ||
      Object.values(value.rulesConfig.prizeBreakdown).reduce((sum, amount) => sum + amount, 0) <=
        (value.prizePool ?? 0),
    { message: "Prize allocation exceeds the prize pool", path: ["rulesConfig", "prizeBreakdown"] },
  );
export const updateTournamentSchema = z.object(createTournamentSchema.shape).partial().strict();
export const createBracketSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    tierName: z.string().trim().min(1).max(100),
    config: competitionConfigSchema.optional(),
    minGti: z.number().min(0).max(100),
    maxGti: z.number().min(0).max(100),
    entryFee: z.number().min(0).optional(),
    maxTeams: z.number().int().min(2).optional(),
    bracketType: z.enum(BracketTypeValues).optional(),
  })
  .strict()
  .refine((v) => v.minGti <= v.maxGti, {
    message: "Minimum GTI cannot exceed maximum",
    path: ["maxGti"],
  });
export const updateBracketSchema = z.object(createBracketSchema.shape).partial().strict();
export const registerBracketSchema = z.object({ teamId: uuidSchema.optional() }).strict();
export const bracketSchema = z.object({
  id: uuidSchema,
  tournamentId: uuidSchema,
  name: z.string(),
  tierName: z.string(),
  minGti: decimalSchema,
  maxGti: decimalSchema,
  entryFee: decimalSchema,
  maxTeams: z.number(),
  bracketType: z.enum(BracketTypeValues),
  roundOrder: z.number(),
  config: jsonSchema,
});
export const tournamentSchema = z.object({
  id: uuidSchema,
  organizerId: uuidSchema,
  name: z.string(),
  title: z.string(),
  sport: z.enum(SportTypeValues),
  status: z.enum(TournamentStatusValues),
  minGti: decimalSchema,
  maxGti: decimalSchema,
  maxTeams: z.number(),
  teamSize: z.number(),
  prizePool: decimalSchema,
  currency: z.string(),
  venueName: z.string(),
  venueLat: z.number(),
  venueLng: z.number(),
  registrationDeadline: dateSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  rulesConfig: jsonSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export const tournamentDetailSchema = tournamentSchema.extend({ brackets: z.array(bracketSchema) });
export const registrationSchema = z.object({
  registrationId: uuidSchema,
  bracketId: uuidSchema,
  tournamentId: uuidSchema,
  athleteId: uuidSchema,
  tierName: z.string(),
  athleteGti: z.number(),
  status: z.enum(RegistrationStatusValues),
  feePaid: z.number(),
  registeredAt: dateSchema,
  teamId: uuidSchema.nullable(),
});
export type NearbyTournamentsQuery = z.infer<typeof nearbyQuerySchema>;
export type TournamentLocation = z.infer<typeof tournamentLocationSchema>;
export type CreateTournamentRequest = z.infer<typeof createTournamentSchema>;
export type CreateBracketRequest = z.infer<typeof createBracketSchema>;
export type RegisterBracketRequest = z.infer<typeof registerBracketSchema>;
export type BracketRegistration = z.infer<typeof registrationSchema>;
export type TournamentDetail = z.infer<typeof tournamentDetailSchema>;
