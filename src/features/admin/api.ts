"use client";
import {
  adminTournamentSchema,
  adminDashboardSchema,
  adminUsersPageSchema,
  adminUserSchema,
  adminTournamentsPageSchema,
  adminAuditPageSchema,
  type AdminUsersQuery,
  type AdminTournamentsQuery,
  type AuditQuery,
} from "@/contracts/admin";
import type { MutationOperation } from "@/lib/api-client";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import { userSchema } from "@/contracts/users";
export const getUser = (id: string, signal?: AbortSignal) =>
  getApi(`users/${id}`, envelope(userSchema), undefined, signal);
export const getAdminDashboard = (signal?: AbortSignal) =>
  getApi("admin/dashboard", envelope(adminDashboardSchema), undefined, signal);
export const getAdminUsers = (query: AdminUsersQuery, signal?: AbortSignal) =>
  getApi("admin/users", envelope(adminUsersPageSchema), query, signal);
export const governUser = (id: string, operation: MutationOperation) =>
  mutateApi(`admin/users/${id}/governance`, envelope(adminUserSchema), operation, "PATCH");
export const getAdminTournaments = (query: AdminTournamentsQuery, signal?: AbortSignal) =>
  getApi("admin/tournaments", envelope(adminTournamentsPageSchema), query, signal);
export const moderateTournament = (id: string, operation: MutationOperation) =>
  mutateApi(
    `admin/tournaments/${id}/moderation`,
    envelope(adminTournamentSchema),
    operation,
    "PATCH",
  );
export const getAuditLogs = (query: AuditQuery, signal?: AbortSignal) =>
  getApi("admin/audit-logs", envelope(adminAuditPageSchema), query, signal);
