import { z } from "zod";
import {
  AuditCategoryValues,
  AuditSeverityValues,
  UserRoleValues,
  VerificationStatusValues,
  TournamentStatusValues,
} from "./enums.generated";
import { cursorPageSchema, cursorQuerySchema, dateSchema, jsonSchema, uuidSchema } from "./common";
import { tournamentSchema } from "./tournaments";
export const queueHealthSchema = z.object({
  name: z.string(),
  status: z.enum(["ok", "paused", "unreachable"]),
  latencyMs: z.number().nonnegative().nullable(),
  waiting: z.number().int().nonnegative().nullable(),
  active: z.number().int().nonnegative().nullable(),
  delayed: z.number().int().nonnegative().nullable(),
  failed: z.number().int().nonnegative().nullable(),
  completed: z.number().int().nonnegative().nullable(),
});
export const adminDashboardSchema = z.object({
  totalVerifiedAthletes: z.number().int().nonnegative(),
  activeTournaments: z.number().int().nonnegative(),
  totalOrganizersAndScouts: z.number().int().nonnegative(),
  totalVerifiedDrills: z.number().int().nonnegative(),
  totalSafetyMatchPauses: z.number().int().nonnegative(),
  totalSandbaggingBlocks: z.number().int().nonnegative(),
  health: z.object({
    status: z.enum(["ok", "degraded"]),
    db: z.enum(["ok", "unavailable"]),
    redis: z.enum(["ok", "unavailable"]),
    uptime: z.number().nonnegative(),
  }),
  dbLatencyMs: z.number().nonnegative().nullable(),
  redisLatencyMs: z.number().nonnegative().nullable(),
  postgisAvailable: z.boolean(),
  postgisLatencyMs: z.number().nonnegative().nullable(),
  bullmqQueuesStatus: z.array(queueHealthSchema),
  observedAt: dateSchema,
});
export const adminUserSchema = z.object({
  id: uuidSchema,
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(UserRoleValues),
  isActive: z.boolean(),
  createdAt: dateSchema,
  identityRecord: z
    .object({
      status: z.enum(VerificationStatusValues),
      reLinkedCount: z.number().int().nonnegative(),
      verifiedAt: dateSchema,
    })
    .nullable(),
});
export const governanceSchema = z
  .object({
    role: z.enum(UserRoleValues).optional(),
    isActive: z.boolean().optional(),
    verificationStatus: z.enum(VerificationStatusValues).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Choose a governance change" });
export const moderationSchema = z
  .object({
    status: z.enum(TournamentStatusValues).optional(),
    featured: z.boolean().optional(),
    suspended: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Choose a moderation change" })
  .refine(
    (value) =>
      value.suspended !== true || value.status === undefined || value.status === "SUSPENDED",
    { message: "Conflicting suspension and status" },
  );
export const adminUsersQuerySchema = cursorQuerySchema
  .extend({
    role: z.enum(UserRoleValues).optional(),
    verificationStatus: z.enum(VerificationStatusValues).optional(),
    isActive: z
      .preprocess(
        (value: unknown) => (value === "true" ? true : value === "false" ? false : value),
        z.boolean(),
      )
      .optional(),
  })
  .strict();
export const adminTournamentsQuerySchema = cursorQuerySchema
  .extend({ status: z.enum(TournamentStatusValues).optional() })
  .strict();
export const auditQuerySchema = cursorQuerySchema
  .extend({
    category: z.enum(AuditCategoryValues).optional(),
    severity: z.enum(AuditSeverityValues).optional(),
  })
  .strict();
export const securityAuditSchema = z.object({
  id: uuidSchema,
  category: z.enum(AuditCategoryValues),
  severity: z.enum(AuditSeverityValues),
  actorUserId: uuidSchema.nullable(),
  targetId: z.string().nullable(),
  summary: z.string(),
  metadata: jsonSchema.nullable(),
  ipHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  createdAt: dateSchema,
});
export const adminUsersPageSchema = cursorPageSchema(adminUserSchema);
export const adminTournamentSchema = tournamentSchema.extend({ isFeatured: z.boolean() });
export const adminTournamentsPageSchema = cursorPageSchema(adminTournamentSchema);
export const adminAuditPageSchema = cursorPageSchema(securityAuditSchema);
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminTournamentsQuery = z.infer<typeof adminTournamentsQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type SecurityAuditEvent = z.infer<typeof securityAuditSchema>;
