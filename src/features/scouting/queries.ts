"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ScoutFeedQuery } from "@/contracts/scouting";
import { useSession } from "@/features/auth/session-provider";
import { getProspects, getAlerts } from "./api";
export function useProspects(filters: ScoutFeedQuery) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["prospects", user.id, filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      getProspects(
        { ...filters, limit: 20, ...(pageParam ? { cursor_id: pageParam } : {}) },
        signal,
      ),
    getNextPageParam: (page, _pages, _previous, cursors) =>
      page.next_cursor && !cursors.includes(page.next_cursor) ? page.next_cursor : undefined,
    maxPages: 5,
  });
}
export function useScoutAlerts(filters: { sport?: string; district?: string }) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["scout-alerts", user.id, filters],
    queryFn: ({ signal }) => getAlerts(filters, signal),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}
