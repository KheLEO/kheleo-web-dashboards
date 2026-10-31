"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getSession, type BrowserSession } from "./api";
const Context = createContext<BrowserSession | null>(null);
export function SessionProvider({
  initial,
  children,
}: {
  initial: BrowserSession;
  children: ReactNode;
}) {
  const query = useQuery({
    queryKey: ["session", initial.user.id],
    queryFn: getSession,
    initialData: initial,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const router = useRouter();
  const client = useQueryClient();
  useEffect(() => {
    if (query.error instanceof ApiError && query.error.problem.status === 401) {
      client.clear();
      window.dispatchEvent(new Event("kheleo:session-ended"));
      router.replace("/login");
    }
  }, [query.error, client, router]);
  return <Context.Provider value={query.data}>{children}</Context.Provider>;
}
export function useSession(): BrowserSession {
  const session = useContext(Context);
  if (!session) throw new Error("SessionProvider is required.");
  return session;
}
