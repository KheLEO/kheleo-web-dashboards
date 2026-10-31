"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { keys } from "@/lib/query/keys";
import { useSession } from "@/features/auth/session-provider";
import { getPassport, getSports } from "./api";
export function usePassport(userId?: string) {
  const { user } = useSession();
  const id = userId ?? user.id;
  return useQuery({
    queryKey: [...keys.passport(id), user.id, user.role],
    queryFn: ({ signal }) => getPassport(id, signal),
    retry: (count, error) =>
      count < 2 && (!(error instanceof ApiError) || error.problem.status >= 500),
  });
}
export function useSports() {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: keys.sports(user.id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => getSports(user.id, pageParam, signal),
    getNextPageParam: (page, _pages, _previous, cursors) =>
      page.has_more && page.next_cursor && !cursors.includes(page.next_cursor)
        ? page.next_cursor
        : undefined,
    maxPages: 5,
  });
}
