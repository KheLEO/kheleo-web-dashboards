"use client";
import { useEffect, useReducer, useState } from "react";
import { pauseEventSchema } from "@/contracts/realtime";
import { EventDeduplicator } from "@/lib/realtime/event-deduplication";
import { subscribeNamespace, type ConnectionStatus } from "@/lib/realtime/socket.client";
import { useSession } from "@/features/auth/session-provider";
import { safetyAlertReducer } from "./alert-reducer";
export function useSafetyEvents(tournamentId: string) {
  const { capabilities } = useSession();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [state, dispatch] = useReducer(safetyAlertReducer, { alerts: [], unseen: null });
  useEffect(() => {
    if (!capabilities.safeEvents) return;
    const seen = new EventDeduplicator(5000, 200);
    return subscribeNamespace("/ws/events", {
      rooms: [{ event: "join:tournament", id: tournamentId }],
      status: setStatus,
      events: {
        MATCH_PAUSE_ALERT: (input: unknown) => {
          const result = pauseEventSchema.safeParse(input);
          if (!result.success) {
            setStatus("error");
            return;
          }
          if (
            result.data.tournament_id === tournamentId &&
            seen.accept(JSON.stringify(result.data))
          )
            dispatch({ type: "receive", alert: result.data });
        },
      },
    });
  }, [tournamentId, capabilities.safeEvents]);
  return {
    ...state,
    status,
    markSeen: () => dispatch({ type: "seen" }),
    enabled: capabilities.safeEvents,
  };
}
