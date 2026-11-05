"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { NearbyTournamentsQuery } from "@/contracts/tournaments";
import { useSession } from "@/features/auth/session-provider";
import { getNearby, getTournament, getBrackets } from "./api";
export function useNearby(filters: NearbyTournamentsQuery | null) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["nearby", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      if (!filters) throw new Error("Choose a search location.");
      return getNearby({ ...filters, ...(pageParam ? { cursor: pageParam } : {}) }, signal);
    },
    getNextPageParam: (page, _pages, _previous, cursors) =>
      page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
        ? page.next_cursor
        : undefined,
    enabled: filters !== null,
  });
}
export function useTournament(id: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["tournament", user.id, id],
    queryFn: ({ signal }) => getTournament(id, signal),
  });
}
export function useBrackets(id: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["brackets", user.id, id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getBrackets(id, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) =>
      page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
        ? page.next_cursor
        : undefined,
  });
}
