"use client";
import { Button } from "@/components/ui/button";
import { CriticalDialog } from "@/components/ui/alert-dialog";
import type { SafetyIncident } from "./alert-reducer";
export function CriticalAlertDialog({
  incident,
  onSeen,
  alarmEnabled,
  toggleAlarm,
}: {
  incident: SafetyIncident | null;
  onSeen: () => void;
  alarmEnabled: boolean;
  toggleAlarm: () => void;
}) {
  return (
    <CriticalDialog
      open={incident !== null}
      onSeen={onSeen}
      title={
        incident?.source === "SIMULATED"
          ? "SIMULATED critical biometric alert"
          : "Critical biometric alert"
      }
    >
      {incident && (
        <>
          <p className="font-semibold">{incident.alert.directive}</p>
          <p className="mt-3">
            {incident.alert.athlete_name} · HR {incident.alert.vitals.heart_rate} bpm · SpO₂{" "}
            {incident.alert.vitals.spo2}% · {incident.alert.vitals.skin_temperature}°C
          </p>
          <p className="mt-3 text-muted-foreground">
            {incident.alert.match_id
              ? "Match context was supplied. Confirm the persisted match state with event officials."
              : "No match ID was supplied. This directive does not confirm that a particular match was updated."}
          </p>
          <Button className="mt-4" variant="secondary" onClick={toggleAlarm}>
            {alarmEnabled ? "Mute audible alerts" : "Enable audible alerts"}
          </Button>
          <p className="mt-3 text-muted-foreground">
            Marking seen records a timestamp only in this browser session. It does not confirm a
            match pause, medical dispatch, or backend acknowledgement.
          </p>
        </>
      )}
    </CriticalDialog>
  );
}
