import { z } from "zod";
import { FreeAgentStatusValues } from "./enums.generated";
import { dateSchema, uuidSchema } from "./common";
export const joinPoolSchema = z
  .object({
    primary_role: z.string().trim().min(1).max(50),
    secondary_role: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
export const rosterMemberSchema = z.object({
  user_id: uuidSchema,
  name: z.string(),
  assigned_role: z.string(),
  gti: z.number(),
});
export const freeAgentStatusSchema = z.object({
  registrationId: uuidSchema,
  userId: uuidSchema,
  tournamentId: uuidSchema,
  bracketId: uuidSchema,
  sport: z.string(),
  primaryRole: z.string(),
  secondaryRole: z.string().nullable().optional(),
  status: z.enum(FreeAgentStatusValues),
  waitPosition: z.number(),
  matchedTeamId: uuidSchema.nullable().optional(),
  teamName: z.string().nullable().optional(),
  assignedRole: z.string().nullable().optional(),
  roster: z.array(rosterMemberSchema).nullable().optional(),
  joinedAt: dateSchema,
});
export const leavePoolSchema = z.object({ message: z.string(), cancelled: z.boolean() });
export type JoinFreeAgentRequest = z.infer<typeof joinPoolSchema>;
export type RosterMember = z.infer<typeof rosterMemberSchema>;
export type FreeAgentStatusResponse = z.infer<typeof freeAgentStatusSchema>;
