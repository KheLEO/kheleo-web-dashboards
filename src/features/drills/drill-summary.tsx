import { Card } from "@/components/ui/card";
import type { DrillSessionState } from "./session-reducer";
export function DrillSummary({ state }: { state: DrillSessionState }) {
  return (
    <Card>
      <h2 className="mb-5 font-semibold">Session insights</h2>
      <dl className="grid gap-5 sm:grid-cols-3">
        {[
          { label: "Valid frames analyzed", value: String(state.framesAnalyzed) },
          {
            label: "Left knee angle",
            value: state.leftKnee === null ? "Not tracked" : `${state.leftKnee.toFixed(1)}°`,
          },
          {
            label: "Right knee angle",
            value: state.rightKnee === null ? "Not tracked" : `${state.rightKnee.toFixed(1)}°`,
          },
        ].map((entry) => (
          <div key={entry.label}>
            <dt className="text-xs text-muted-foreground">{entry.label}</dt>
            <dd className="mt-2 text-xl font-semibold tabular-nums text-primary">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
