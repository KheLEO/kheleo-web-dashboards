"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { rosterEventSchema } from "@/contracts/realtime";
import { keys } from "@/lib/query/keys";
import { subscribeNamespace, type ConnectionStatus } from "@/lib/realtime/socket.client";
import { EventDeduplicator } from "@/lib/realtime/event-deduplication";
export function useRosterEvents(tournamentId: string, bracketId: string): ConnectionStatus {
  const { user } = useSession();
  const client = useQueryClient();
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  useEffect(() => {
    const seen = new EventDeduplicator();
    const refresh = (): void => {
      void client.invalidateQueries({ queryKey: keys.pool(user.id, tournamentId, bracketId) });
    };
    return subscribeNamespace("/ws/matchmaking", {
      rooms: [
        { event: "join:user", id: user.id },
        { event: "join:bracket", id: bracketId },
      ],
      status: setConnection,
      connected: refresh,
      events: {
        ROSTER_FORMED: (value: unknown) => {
          const result = rosterEventSchema.safeParse(value);
          if (!result.success) {
            setConnection("error");
            return;
          }
          if (result.data.data.bracket_id === bracketId && seen.accept(result.data.data.team_id))
            refresh();
        },
      },
    });
  }, [user.id, tournamentId, bracketId, client]);
  return connection;
}
