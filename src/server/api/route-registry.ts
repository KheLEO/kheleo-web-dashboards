import "server-only";
import { z } from "zod";
import { cursorQuerySchema } from "@/contracts/common";
import { governmentIdSchema } from "@/contracts/auth";
import { createPassportSchema, updatePassportSchema, sportInputSchema } from "@/contracts/passport";
import {
  createBracketSchema,
  createTournamentSchema,
  nearbyQuerySchema,
  registerBracketSchema,
} from "@/contracts/tournaments";
import { joinPoolSchema } from "@/contracts/matchmaking";
import { scoutFeedQuerySchema } from "@/contracts/scouting";
import { submitDrillSchema } from "@/contracts/drills";
import { telemetrySchema } from "@/contracts/safety";
import { updateUserSchema } from "@/contracts/users";
import type { UserRole } from "@/contracts/enums.generated";

export interface RelayRoute {
  method: string;
  pattern: RegExp;
  body?: z.ZodType;
  query: z.ZodType;
  roles?: readonly UserRole[];
  identity?: "self" | "passport-read";
  ownsTournament?: boolean;
  signed?: "drill" | "telemetry";
}
const noQuery = z.object({}).strict();
const noBody = z.object({}).strict();
const uuid = "([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})";
const path = (value: string): RegExp => new RegExp(`^${value}$`);
const tournament = `tournaments/${uuid}`;
const bracket = `${tournament}/brackets/${uuid}`;
const scouts: readonly UserRole[] = ["SCOUT", "FEDERATION_ADMIN", "SUPER_ADMIN"];
const organizers: readonly UserRole[] = ["ORGANIZER", "FEDERATION_ADMIN", "SUPER_ADMIN"];
const athletes: readonly UserRole[] = ["ATHLETE", "SUPER_ADMIN"];
export const routeRegistry: readonly RelayRoute[] = [
  {
    method: "POST",
    pattern: path("auth/verify-government-id"),
    body: governmentIdSchema,
    query: noQuery,
  },
  { method: "GET", pattern: path(`users/${uuid}`), query: noQuery, identity: "self" },
  {
    method: "PATCH",
    pattern: path(`users/${uuid}`),
    body: updateUserSchema,
    query: noQuery,
    identity: "self",
  },
  {
    method: "DELETE",
    pattern: path(`users/${uuid}`),
    body: noBody,
    query: noQuery,
    identity: "self",
  },
  { method: "GET", pattern: path(`passport/${uuid}`), query: noQuery, identity: "passport-read" },
  {
    method: "POST",
    pattern: path(`passport/${uuid}`),
    body: createPassportSchema,
    query: noQuery,
    identity: "self",
  },
  {
    method: "PATCH",
    pattern: path(`passport/${uuid}`),
    body: updatePassportSchema,
    query: noQuery,
    identity: "self",
  },
  {
    method: "GET",
    pattern: path(`passport/${uuid}/sports`),
    query: cursorQuerySchema,
    identity: "passport-read",
  },
  {
    method: "POST",
    pattern: path(`passport/${uuid}/sports`),
    body: sportInputSchema.omit({ verifiedMetrics: true, earnedBadges: true }),
    query: noQuery,
    identity: "self",
  },
  { method: "GET", pattern: path("tournaments/nearby"), query: nearbyQuerySchema },
  { method: "GET", pattern: path(tournament), query: noQuery },
  {
    method: "POST",
    pattern: path("tournaments"),
    body: createTournamentSchema,
    query: noQuery,
    roles: organizers,
  },
  { method: "GET", pattern: path(`${tournament}/brackets`), query: cursorQuerySchema },
  {
    method: "POST",
    pattern: path(`${tournament}/brackets`),
    body: createBracketSchema,
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "POST",
    pattern: path(`${bracket}/register`),
    body: registerBracketSchema,
    query: noQuery,
    roles: athletes,
  },
  {
    method: "POST",
    pattern: path(`${bracket}/free-agents/join`),
    body: joinPoolSchema,
    query: noQuery,
    roles: athletes,
  },
  {
    method: "DELETE",
    pattern: path(`${bracket}/free-agents/leave`),
    body: noBody,
    query: noQuery,
    roles: athletes,
  },
  {
    method: "GET",
    pattern: path(`${bracket}/free-agents/status`),
    query: noQuery,
    roles: athletes,
  },
  {
    method: "POST",
    pattern: path("drills/submit"),
    body: submitDrillSchema,
    query: noQuery,
    roles: athletes,
    signed: "drill",
  },
  {
    method: "POST",
    pattern: path("safety/telemetry-webhook"),
    body: telemetrySchema,
    query: noQuery,
    roles: athletes,
    signed: "telemetry",
  },
  { method: "GET", pattern: path("scouts/feed"), query: scoutFeedQuerySchema, roles: scouts },
  {
    method: "GET",
    pattern: path("scouts/alerts"),
    query: z.object({ sport: z.string().optional(), district: z.string().optional() }).strict(),
    roles: scouts,
  },
  {
    method: "PATCH",
    pattern: path(`scouts/alerts/${uuid}/acknowledge`),
    body: noBody,
    query: noQuery,
    roles: scouts,
  },
  { method: "GET", pattern: path("heatmaps/regional"), query: noQuery, roles: scouts },
  {
    method: "GET",
    pattern: path(`gti/rank/([A-Z_]+)/${uuid}`),
    query: z.object({ district: z.string().optional() }).strict(),
  },
  {
    method: "POST",
    pattern: path(`gti/recalculate/${uuid}`),
    body: noBody,
    query: noQuery,
    identity: "self",
  },
];
