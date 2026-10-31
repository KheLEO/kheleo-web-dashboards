"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { getRegional } from "./api";
export function useRegional() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["regional", user.id],
    queryFn: ({ signal }) => getRegional(signal),
    staleTime: 60000,
  });
}
