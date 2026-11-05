"use client";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CriticalDialog } from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared/async-state";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { acknowledgeSafetySchema, resumeSafetySchema } from "@/contracts/safety";
import { acknowledgeSafety, resumeSafetyMatch } from "./api";
import type { SafetyIncident } from "./alert-reducer";
interface CriticalAlertDialogProps {
  incident: SafetyIncident | null;
  onSeen: () => void;
  alarmEnabled: boolean;
  toggleAlarm: () => void;
  onUpdated?: () => void;
  acknowledged?: boolean;
  matchPaused?: boolean;
}
export function CriticalAlertDialog({
  incident,
  onSeen,
  alarmEnabled,
  toggleAlarm,
  onUpdated,
  acknowledged = false,
  matchPaused = false,
}: CriticalAlertDialogProps) {
  const [note, setNote] = useState("");
  const [clearance, setClearance] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const ack = useMutation({
    mutationFn: (action: MutationOperation) => {
      if (!incident?.alert.alert_id) throw new Error("Persisted incident ID required");
      return acknowledgeSafety(incident.alert.alert_id, action);
    },
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      operation.current = null;
      onUpdated?.();
    },
  });
  const resume = useMutation({
    mutationFn: (action: MutationOperation) => {
      if (!incident?.alert.match_id) throw new Error("Match ID required");
      return resumeSafetyMatch(incident.alert.match_id, action);
    },
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      operation.current = null;
      onUpdated?.();
      onSeen();
    },
  });
  const durable = Boolean(incident?.alert.alert_id);
  const wasAcknowledged = acknowledged || ack.isSuccess;
  const pending = ack.isPending || resume.isPending;
  const actions = durable ? (
    <div className="space-y-5">
      <label className="field">
        Medical check / clearance note
        <textarea
          className="control"
          value={note}
          minLength={5}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {!wasAcknowledged && (
        <Button
          disabled={pending || Boolean(incident?.alert.match_id && !matchPaused)}
          className="h-auto whitespace-normal py-4"
          onClick={() => {
            if (flight.current) return;
            const parsed = acknowledgeSafetySchema.safeParse({
              medicalCheckNote: note,
              medicalCheckDispatched: true,
            });
            if (!parsed.success) {
              setValidation("Record a medical-check note of at least five characters.");
              return;
            }
            setValidation(null);
            flight.current = true;
            operation.current = sameOperation(operation.current, parsed.data);
            ack.mutate(operation.current);
          }}
        >
          Acknowledge & Confirm Match Paused / Medical Check Dispatched
        </Button>
      )}
      {wasAcknowledged && <p role="status">Medical check recorded on the server.</p>}
      {incident?.alert.match_id && (
        <>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={clearance}
              onChange={(event) => setClearance(event.target.checked)}
            />
            Medical clearance has been confirmed by field staff
          </label>
          <Button
            disabled={pending || !wasAcknowledged || !clearance || !matchPaused}
            className="h-auto whitespace-normal py-4"
            onClick={() => {
              if (flight.current) return;
              const parsed = resumeSafetySchema.safeParse({
                medicalClearanceConfirmed: clearance,
                medicalClearanceNote: note,
              });
              if (!parsed.success) {
                setValidation("Confirm medical clearance and record its note.");
                return;
              }
              setValidation(null);
              flight.current = true;
              operation.current = sameOperation(operation.current, parsed.data);
              resume.mutate(operation.current);
            }}
          >
            Clear Athlete & Resume Match
          </Button>
        </>
      )}
      {wasAcknowledged && (
        <Button variant="secondary" disabled={pending} onClick={onSeen}>
          Return to safety wall
        </Button>
      )}
      {validation && <p role="alert">{validation}</p>}
      {ack.error && <ErrorState error={ack.error} />}
      {resume.error && <ErrorState error={resume.error} />}
    </div>
  ) : undefined;
  return (
    <CriticalDialog
      fullScreen
      open={incident !== null}
      onSeen={onSeen}
      title={
        incident?.source === "SIMULATED"
          ? "SIMULATED critical biometric alert"
          : "Critical biometric alert"
      }
      {...(actions ? { action: actions } : {})}
    >
      {incident && (
        <>
          <p className="text-lg font-semibold">{incident.alert.directive}</p>
          <p className="mt-4">
            {incident.alert.athlete_name} · HR {incident.alert.vitals.heart_rate} bpm · SpO₂{" "}
            {incident.alert.vitals.spo2}% · {incident.alert.vitals.skin_temperature}°C
          </p>
          <p className="mt-4">
            {incident.alert.match_id
              ? `Match state: ${matchPaused ? "PAUSED_SAFETY" : "checking persisted match status"}.`
              : "No match ID was supplied. The medical check applies to this athlete."}
          </p>
          <Button className="mt-5" variant="secondary" onClick={toggleAlarm}>
            {alarmEnabled ? "Mute audible alerts" : "Enable audible alerts"}
          </Button>
          {!durable && (
            <p className="mt-4 text-muted-foreground">
              Local emergency preview. No backend incident is being acknowledged.
            </p>
          )}
        </>
      )}
    </CriticalDialog>
  );
}
