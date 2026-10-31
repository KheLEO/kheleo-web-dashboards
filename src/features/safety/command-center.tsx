"use client";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { DependencyState } from "@/components/shared/dependency-state";
import { ConnectionStatusBadge } from "@/components/shared/connection-status";
import { useSafetyEvents } from "./use-safety-events";
import { CriticalAlertDialog } from "./critical-alert-dialog";
export function CommandCenter({ tournamentId }: { tournamentId: string }) {
  const safety = useSafetyEvents(tournamentId);
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Live safety connection</h2>
          <ConnectionStatusBadge status={safety.status} />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Critical: heart rate above 195 bpm, SpO₂ below 90%, or skin temperature above 39.5°C.
          Warning: above 185 bpm, below 93%, or above 38.5°C respectively.
        </p>
      </Card>
      {!safety.enabled && (
        <DependencyState
          title="Safety stream awaiting isolation verification"
          description="The current event gateway broadcasts sensitive safety alerts globally. Live subscriptions stay disabled until connection authentication, room authorization, and targeted broadcasting are verified."
        />
      )}
      <DependencyState
        title="Persisted safety history and match status"
        description="A durable alert history and current-match snapshot are not available. This page cannot establish that a match has resumed or that there are no outstanding alerts."
      />
      {safety.enabled && safety.alerts.length === 0 && (
        <Alert>
          No alerts have been received during this connected session. Earlier or missed alerts
          cannot be recovered yet.
        </Alert>
      )}
      {safety.alerts.map((alert, index) => (
        <Card key={`${alert.athlete_id}:${index}`} className="border-destructive/50">
          <h2 className="font-semibold">{alert.athlete_name}</h2>
          <p className="mt-2 text-sm">{alert.directive}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            HR {alert.vitals.heart_rate} · SpO₂ {alert.vitals.spo2}% ·{" "}
            {alert.vitals.skin_temperature}°C
          </p>
        </Card>
      ))}
      <CriticalAlertDialog alert={safety.unseen} onSeen={safety.markSeen} />
    </div>
  );
}
