import type { MatchPauseAlert } from "@/contracts/realtime";
export interface SafetyAlertState {
  alerts: MatchPauseAlert[];
  unseen: MatchPauseAlert | null;
}
export type SafetyAlertAction = { type: "receive"; alert: MatchPauseAlert } | { type: "seen" };
export function safetyAlertReducer(
  state: SafetyAlertState,
  action: SafetyAlertAction,
): SafetyAlertState {
  return action.type === "seen"
    ? { ...state, unseen: null }
    : { alerts: [action.alert, ...state.alerts].slice(0, 50), unseen: action.alert };
}
