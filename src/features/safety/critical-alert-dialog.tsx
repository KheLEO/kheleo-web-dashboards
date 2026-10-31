"use client";
import type { MatchPauseAlert } from "@/contracts/realtime";
import { CriticalDialog } from "@/components/ui/alert-dialog";
export function CriticalAlertDialog({
  alert,
  onSeen,
}: {
  alert: MatchPauseAlert | null;
  onSeen: () => void;
}) {
  return (
    <CriticalDialog open={alert !== null} onSeen={onSeen} title="Critical biometric alert">
      {alert && (
        <>
          <p className="font-semibold">{alert.directive}</p>
          <p className="mt-3">
            {alert.athlete_name} · HR {alert.vitals.heart_rate} bpm · SpO₂ {alert.vitals.spo2}% ·{" "}
            {alert.vitals.skin_temperature}°C
          </p>
          <p className="mt-3 text-muted-foreground">
            {alert.match_id
              ? "Match context was supplied. Confirm the persisted match state with the event officials."
              : "No match ID was supplied. This directive does not confirm that a particular match was updated."}
          </p>
        </>
      )}
    </CriticalDialog>
  );
}
