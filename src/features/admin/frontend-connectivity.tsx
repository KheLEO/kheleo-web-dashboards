"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { getSession } from "@/features/auth/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
export function FrontendConnectivity() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Web session has not been checked here.");
  const flight = useRef(false);
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Frontend connectivity</h2>
      <p className="text-sm text-muted-foreground">
        Browser network hint: {online ? "online" : "offline"}. This hint does not establish backend
        availability.
      </p>
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
      <Button
        className="mt-5"
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          if (flight.current) return;
          flight.current = true;
          setPending(true);
          try {
            const session = await getSession();
            setMessage(
              `Web session responded for ${session.user.role} at ${new Date().toLocaleTimeString()}. Redis, PostGIS and queue health remain unmeasured.`,
            );
          } catch {
            setMessage(
              "The web session check failed. Reauthenticate or retry when connectivity returns.",
            );
          } finally {
            flight.current = false;
            setPending(false);
          }
        }}
      >
        Check web session
      </Button>
    </Card>
  );
}
