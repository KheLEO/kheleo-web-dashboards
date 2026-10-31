"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { NearbyTournamentsQuery } from "@/contracts/tournaments";
import { useSession } from "@/features/auth/session-provider";
import { getNearby, getTournament, getBrackets } from "./api";
export function useNearby(filters: NearbyTournamentsQuery | null) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["nearby", user.id, filters],
    queryFn: ({ signal }) => {
      if (!filters) throw new Error("Choose a search location.");
      return getNearby(filters, signal);
    },
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
    getNextPageParam: (page) => (page.has_more ? page.next_cursor : undefined),
    maxPages: 5,
  });
}

export function useNearbyPages(filters: NearbyTournamentsQuery) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["nearby-pages", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getNearby({ ...filters, ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: (page, _pages, previousCursor) => {
      const next = page.length === (filters.limit ?? 20) ? page.at(-1)?.id : undefined;
      return next === previousCursor ? undefined : next;
    },
    maxPages: 5,
  });
}
