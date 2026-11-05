"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { getTournamentVitals, getSafetyHistory } from "./api";
const next = (
  page: { has_more: boolean; next_cursor: string | null },
  cursors: (string | null)[],
) =>
  page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
    ? page.next_cursor
    : undefined;
export function useTournamentVitals(id: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["safety-vitals", user.id, id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getTournamentVitals(id, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => next(page, cursors),
    refetchInterval: 15000,
  });
}
export function useSafetyHistory(id: string) {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: ["safety-history", user.id, id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getSafetyHistory(id, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) => next(page, cursors),
    refetchInterval: 15000,
  });
}
