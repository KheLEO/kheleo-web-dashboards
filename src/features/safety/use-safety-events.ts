"use client";
import { useEffect, useReducer, useState } from "react";
import { pauseEventSchema, vitalsUpdatedEventSchema } from "@/contracts/realtime";
import { EventDeduplicator } from "@/lib/realtime/event-deduplication";
import { subscribeNamespace, type ConnectionStatus } from "@/lib/realtime/socket.client";
import { useSession } from "@/features/auth/session-provider";
import { safetyAlertReducer } from "./alert-reducer";
export function useSafetyEvents(tournamentId: string, onUpdate?: () => void) {
  const { capabilities, user } = useSession();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [state, dispatch] = useReducer(safetyAlertReducer, { incidents: [] });
  useEffect(() => {
    if (!capabilities.safeEvents) return;
    const seen = new EventDeduplicator(5000, 200);
    return subscribeNamespace("/ws/events", {
      rooms: [{ event: "join:tournament", id: tournamentId }],
      status: setStatus,
      ...(onUpdate ? { connected: onUpdate } : {}),
      events: {
        VITALS_UPDATED: (input: unknown) => {
          const result = vitalsUpdatedEventSchema.safeParse(input);
          if (result.success && result.data.tournament_id === tournamentId) onUpdate?.();
        },
        MATCH_PAUSE_ALERT: (input: unknown) => {
          const result = pauseEventSchema.safeParse(input);
          if (!result.success) {
            setStatus("error");
            return;
          }
          if (result.data.tournament_id === tournamentId) onUpdate?.();
          if (
            result.data.tournament_id === tournamentId &&
            seen.accept(JSON.stringify(result.data))
          )
            dispatch({
              type: "receive",
              incident: {
                id: result.data.alert_id ?? result.data.event_id ?? crypto.randomUUID(),
                alert: result.data,
                source: result.data.source === "SIMULATOR" ? "SIMULATED" : "LIVE",
                receivedAt: Date.now(),
                seenAt: null,
              },
            });
        },
      },
    });
  }, [tournamentId, capabilities.safeEvents, onUpdate]);
  const unseen = [...state.incidents].reverse().find((entry) => entry.seenAt === null) ?? null;
  return {
    ...state,
    unseen,
    status,
    enabled: capabilities.safeEvents,
    markSeen: () => {
      if (unseen) dispatch({ type: "seen", id: unseen.id, timestamp: Date.now() });
    },
    simulate: () =>
      dispatch({
        type: "receive",
        incident: {
          id: crypto.randomUUID(),
          source: "SIMULATED",
          receivedAt: Date.now(),
          seenAt: null,
          alert: {
            event: "MATCH_PAUSE_ALERT",
            severity: "CRITICAL",
            athlete_id: user.id,
            athlete_name: "Simulated field athlete",
            tournament_id: tournamentId,
            vitals: { heart_rate: 202, spo2: 87, skin_temperature: 40 },
            directive: "SIMULATED MANDATORY REST: PAUSE TOURNAMENT MATCH IMMEDIATELY",
          },
        },
      }),
  };
}
