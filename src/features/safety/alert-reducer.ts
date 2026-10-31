import type { MatchPauseAlert } from "@/contracts/realtime";
export interface SafetyIncident {
  id: string;
  alert: MatchPauseAlert;
  source: "LIVE" | "SIMULATED";
  receivedAt: number;
  seenAt: number | null;
}
export interface SafetyAlertState {
  incidents: SafetyIncident[];
}
export type SafetyAlertAction =
  { type: "receive"; incident: SafetyIncident } | { type: "seen"; id: string; timestamp: number };
export function safetyAlertReducer(
  state: SafetyAlertState,
  action: SafetyAlertAction,
): SafetyAlertState {
  if (action.type === "seen")
    return {
      incidents: state.incidents.map((entry) =>
        entry.id === action.id && entry.seenAt === null
          ? { ...entry, seenAt: action.timestamp }
          : entry,
      ),
    };
  if (state.incidents.some((entry) => entry.id === action.incident.id)) return state;
  return { incidents: [action.incident, ...state.incidents].slice(0, 50) };
}
