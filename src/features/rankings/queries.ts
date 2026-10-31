"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { getRank } from "./api";
export function useRank(sport: string, district?: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["rank", user.id, sport, district ?? "national"],
    queryFn: ({ signal }) => getRank(sport, user.id, district, signal),
    enabled: Boolean(sport),
  });
}
