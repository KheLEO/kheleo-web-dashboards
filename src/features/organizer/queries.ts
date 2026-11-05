"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import {
  getOrganizerSummary,
  getOwnedTournaments,
  getRegistrations,
  getPool,
  getSandbaggingLogs,
} from "./api";
const nextPage = (
  page: { has_more: boolean; next_cursor: string | null },
  cursors: (string | null)[],
) =>
  page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
    ? page.next_cursor
    : undefined;
export function useOrganizerSummary() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["organizer-summary", user.id],
    queryFn: ({ signal }) => getOrganizerSummary(signal),
    refetchInterval: 15000,
  });
}
export function useOwnedTournaments() {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["owned-tournaments", user.id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getOwnedTournaments(pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => nextPage(page, cursors),
  });
}
export function useRegistrations(tournamentId: string, bracketId: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["organizer-registrations", user.id, tournamentId, bracketId],
    initialPageParam: null as string | null,
    enabled: !!bracketId,
    queryFn: ({ pageParam, signal }) =>
      getRegistrations(tournamentId, bracketId, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => nextPage(page, cursors),
  });
}
export function usePool(tournamentId: string, bracketId: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["organizer-pool", user.id, tournamentId, bracketId],
    initialPageParam: null as string | null,
    enabled: !!bracketId,
    queryFn: ({ pageParam, signal }) => getPool(tournamentId, bracketId, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => nextPage(page, cursors),
  });
}
export function useSandbaggingLogs(tournamentId: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["sandbagging-logs", user.id, tournamentId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getSandbaggingLogs(tournamentId, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => nextPage(page, cursors),
  });
}
