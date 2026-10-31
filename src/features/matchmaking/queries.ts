"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { keys } from "@/lib/query/keys";
import { getPool } from "./api";
export function usePool(tournamentId: string, bracketId: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: keys.pool(user.id, tournamentId, bracketId),
    queryFn: ({ signal }) => getPool(tournamentId, bracketId, signal),
    refetchInterval: 15000,
    retry: false,
  });
}
