import { withGtiAliases } from "./gti-aliases";
import "server-only";
import {
  adminUsersQuerySchema,
  adminTournamentsQuerySchema,
  auditQuerySchema,
  governanceSchema,
  moderationSchema,
} from "@/contracts/admin";
import { z } from "zod";
import { cursorQuerySchema } from "@/contracts/common";
import { governmentIdSchema } from "@/contracts/auth";
import { createPassportSchema, updatePassportSchema, sportInputSchema } from "@/contracts/passport";
import {
  createBracketSchema,
  createTournamentSchema,
  updateTournamentSchema,
  updateBracketSchema,
  nearbyQuerySchema,
  registerBracketSchema,
} from "@/contracts/tournaments";
import { joinPoolSchema } from "@/contracts/matchmaking";
import { leaderboardQuerySchema } from "@/contracts/gti";
import { outreachSchema, scoutFeedQuerySchema } from "@/contracts/scouting";
import { poseSubmissionSchema } from "@/contracts/drills";
import { recordMatchResultSchema } from "@/contracts/organizer";
import { acknowledgeSafetySchema, resumeSafetySchema, telemetrySchema } from "@/contracts/safety";
import { updateUserSchema } from "@/contracts/users";
import type { UserRole } from "@/contracts/enums.generated";

export interface RelayRoute {
  method: string;
  pattern: RegExp;
  body?: z.ZodType;
  query: z.ZodType;
  roles?: readonly UserRole[];
  identity?: "self" | "passport-read" | "dossier-read";
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
    method: "GET",
    pattern: path("admin/dashboard"),
    query: noQuery,
    roles: ["SUPER_ADMIN", "FEDERATION_ADMIN"],
  },
  {
    method: "GET",
    pattern: path("admin/users"),
    query: adminUsersQuerySchema,
    roles: ["SUPER_ADMIN", "FEDERATION_ADMIN"],
  },
  {
    method: "GET",
    pattern: path("admin/tournaments"),
    query: adminTournamentsQuerySchema,
    roles: ["SUPER_ADMIN", "FEDERATION_ADMIN"],
  },
  {
    method: "GET",
    pattern: path("admin/audit-logs"),
    query: auditQuerySchema,
    roles: ["SUPER_ADMIN", "FEDERATION_ADMIN"],
  },
  {
    method: "PATCH",
    pattern: path(`admin/users/${uuid}/(?:governance|status)`),
    body: governanceSchema,
    query: noQuery,
    roles: ["SUPER_ADMIN"],
  },
  {
    method: "PATCH",
    pattern: path(`admin/tournaments/${uuid}/(?:moderation|status)`),
    body: moderationSchema,
    query: noQuery,
    roles: ["SUPER_ADMIN", "FEDERATION_ADMIN"],
  },

  {
    method: "GET",
    pattern: path("gti/leaderboards"),
    query: leaderboardQuerySchema,
    roles: scouts,
  },
  {
    method: "GET",
    pattern: path(`users/${uuid}/dossier`),
    query: noQuery,
    identity: "dossier-read",
  },
  {
    method: "POST",
    pattern: path(`scouts/dossiers/${uuid}/outreach`),
    body: outreachSchema,
    query: noQuery,
    roles: scouts,
  },

  {
    method: "POST",
    pattern: path("auth/verify-government-id"),
    body: governmentIdSchema,
    query: noQuery,
  },
  {
    method: "POST",
    pattern: path("auth/verify-gov-id"),
    body: governmentIdSchema,
    query: noQuery,
  },
  { method: "GET", pattern: path("users/profile"), query: noQuery },
  {
    method: "POST",
    pattern: path("users/profile"),
    body: createPassportSchema,
    query: noQuery,
  },
  {
    method: "PATCH",
    pattern: path("users/profile"),
    body: updatePassportSchema,
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
  {
    method: "GET",
    pattern: path("tournaments/organizer/summary"),
    query: noQuery,
    roles: organizers,
  },
  {
    method: "GET",
    pattern: path("tournaments/organizer/mine"),
    query: cursorQuerySchema,
    roles: organizers,
  },
  {
    method: "PATCH",
    pattern: path(tournament),
    body: withGtiAliases(updateTournamentSchema),
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "DELETE",
    pattern: path(tournament),
    body: noBody,
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "PATCH",
    pattern: path(bracket),
    body: withGtiAliases(updateBracketSchema),
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "DELETE",
    pattern: path(bracket),
    body: noBody,
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "GET",
    pattern: path(`${bracket}/registrations`),
    query: cursorQuerySchema,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "GET",
    pattern: path(`${bracket}/free-agents/pool`),
    query: cursorQuerySchema,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "POST",
    pattern: path(`${bracket}/free-agents/process`),
    body: noBody,
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "GET",
    pattern: path(`${tournament}/sandbagging-logs`),
    query: cursorQuerySchema,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "POST",
    pattern: path(`${bracket}/matches/results`),
    body: recordMatchResultSchema,
    query: noQuery,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "GET",
    pattern: path(`safety/tournaments/${uuid}/vitals`),
    query: cursorQuerySchema,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "GET",
    pattern: path(`safety/tournaments/${uuid}/alerts`),
    query: cursorQuerySchema,
    roles: organizers,
    ownsTournament: true,
  },
  {
    method: "PATCH",
    pattern: path(`safety/alerts/${uuid}/acknowledge`),
    body: acknowledgeSafetySchema,
    query: noQuery,
    roles: organizers,
  },
  {
    method: "POST",
    pattern: path(`safety/matches/${uuid}/resume`),
    body: resumeSafetySchema,
    query: noQuery,
    roles: organizers,
  },
  { method: "GET", pattern: path("tournaments/nearby"), query: nearbyQuerySchema },
  { method: "GET", pattern: path(tournament), query: noQuery },
  {
    method: "POST",
    pattern: path("tournaments"),
    body: withGtiAliases(createTournamentSchema),
    query: noQuery,
    roles: organizers,
  },
  { method: "GET", pattern: path(`${tournament}/brackets`), query: cursorQuerySchema },
  {
    method: "POST",
    pattern: path(`${tournament}/brackets`),
    body: withGtiAliases(createBracketSchema),
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
    body: poseSubmissionSchema,
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
