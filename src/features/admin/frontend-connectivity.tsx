"use client";
import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/features/auth/api";
import { useSession } from "@/features/auth/session-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/async-state";
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
export function FrontendConnectivity() {
  const { user } = useSession();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const query = useQuery({
    queryKey: ["admin-relay-probe", user.id],
    queryFn: async () => {
      const start = performance.now();
      const session = await getSession();
      return {
        role: session.user.role,
        latencyMs: performance.now() - start,
        observedAt: new Date().toISOString(),
      };
    },
    staleTime: 15000,
  });
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Next.js relay and web session</h2>
      <p className="text-sm">Browser network hint: {online ? "online" : "offline"}.</p>
      {query.isPending ? (
        <p role="status">Checking the authenticated web session…</p>
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <p role="status" className="mt-3 text-sm">
          Web session responded for {query.data.role} · relay round trip{" "}
          {query.data.latencyMs.toFixed(1)} ms ·{" "}
          {new Date(query.data.observedAt).toLocaleTimeString()}.
        </p>
      )}
      <Button
        className="mt-5"
        variant="secondary"
        disabled={query.isFetching}
        onClick={() => {
          void query.refetch();
        }}
      >
        Check web session
      </Button>
    </Card>
  );
}
