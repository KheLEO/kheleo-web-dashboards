"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import type { LeaderboardQuery } from "@/contracts/gti";
import { getLeaderboards } from "./api";
export function useLeaderboards(filters: LeaderboardQuery | null) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["leaderboards", user.id, filters],
    enabled: filters !== null,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      if (!filters) throw new Error("Choose the required geographic filters");
      return getLeaderboards(
        { ...filters, ...(pageParam ? { cursor_id: pageParam } : {}) },
        signal,
      );
    },
    getNextPageParam: (page, _pages, _previous, cursors) =>
      page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
        ? page.next_cursor
        : undefined,
  });
}
