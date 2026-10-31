export interface DrillSessionState {
  status: "idle" | "loading" | "tracking" | "stopped" | "error";
  framesAnalyzed: number;
  feedback: string;
  leftKnee: number | null;
  rightKnee: number | null;
  error: string | null;
}
export const initialDrillState: DrillSessionState = {
  status: "idle",
  framesAnalyzed: 0,
  feedback: "Start the camera when you are ready.",
  leftKnee: null,
  rightKnee: null,
  error: null,
};
export type DrillAction =
  | { type: "start" }
  | { type: "ready" }
  | {
      type: "frame";
      validFrames: number;
      feedback: string;
      leftKnee: number | null;
      rightKnee: number | null;
    }
  | { type: "stop" }
  | { type: "error"; message: string };
export function drillSessionReducer(
  state: DrillSessionState,
  action: DrillAction,
): DrillSessionState {
  switch (action.type) {
    case "start":
      return {
        ...initialDrillState,
        status: "loading",
        feedback: "Loading the on-device pose engine…",
      };
    case "ready":
      return { ...state, status: "tracking" };
    case "stop":
      return {
        ...state,
        status: "stopped",
        feedback: "Camera stopped. Your summary stays in this page only.",
      };
    case "error":
      return { ...state, status: "error", error: action.message };
    case "frame":
      return {
        ...state,
        framesAnalyzed: action.validFrames,
        feedback: action.feedback,
        leftKnee: action.leftKnee,
        rightKnee: action.rightKnee,
      };
  }
}
