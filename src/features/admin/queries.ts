"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { getAdminDashboard, getAdminUsers, getAdminTournaments, getAuditLogs } from "./api";
import type { AdminUsersQuery, AdminTournamentsQuery, AuditQuery } from "@/contracts/admin";
const next = (
  page: { has_more: boolean; next_cursor: string | null },
  cursors: (string | null)[],
) =>
  page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
    ? page.next_cursor
    : undefined;
export function useAdminDashboard() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["admin-dashboard", user.id],
    queryFn: ({ signal }) => getAdminDashboard(signal),
    refetchInterval: 30000,
  });
}
export function useAdminUsers(filters: AdminUsersQuery) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["admin-users", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getAdminUsers(
        { ...filters, limit: 20, ...(pageParam ? { cursor_id: pageParam } : {}) },
        signal,
      ),
    getNextPageParam: (page, _pages, _previous, cursors) => next(page, cursors),
  });
}
export function useAdminTournaments(filters: AdminTournamentsQuery) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["admin-tournaments", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getAdminTournaments(
        { ...filters, limit: 20, ...(pageParam ? { cursor_id: pageParam } : {}) },
        signal,
      ),
    getNextPageParam: (page, _pages, _previous, cursors) => next(page, cursors),
  });
}
export function useAuditLogs(filters: AuditQuery) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["admin-audit", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getAuditLogs(
        { ...filters, limit: 20, ...(pageParam ? { cursor_id: pageParam } : {}) },
        signal,
      ),
    getNextPageParam: (page, _pages, _previous, cursors) => next(page, cursors),
  });
}
