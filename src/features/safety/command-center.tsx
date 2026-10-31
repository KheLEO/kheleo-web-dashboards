"use client";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { DependencyState } from "@/components/shared/dependency-state";
import { ConnectionStatusBadge } from "@/components/shared/connection-status";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { useSession } from "@/features/auth/session-provider";
import { useTournament } from "@/features/tournaments/queries";
import { classifyVitals } from "@/contracts/safety";
import { useSafetyEvents } from "./use-safety-events";
import { useSafetyAlarm } from "./use-safety-alarm";
import { CriticalAlertDialog } from "./critical-alert-dialog";
import type { SafetyIncident } from "./alert-reducer";
import { VitalsChart } from "./vitals-chart";
function IncidentWall({ incidents }: { incidents: SafetyIncident[] }) {
  const athletes = new Map<string, SafetyIncident>();
  for (const incident of incidents) {
    const key = `${incident.source}:${incident.alert.athlete_id}`;
    if (!athletes.has(key)) athletes.set(key, incident);
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from(athletes.values()).map((incident) => {
        const alert = incident.alert;
        const level = classifyVitals(alert.vitals);
        const readings = incidents
          .filter(
            (entry) =>
              entry.source === incident.source && entry.alert.athlete_id === alert.athlete_id,
          )
          .reverse()
          .map((entry) => ({
            heartRate: entry.alert.vitals.heart_rate,
            spo2: entry.alert.vitals.spo2,
            skinTemperature: entry.alert.vitals.skin_temperature,
            timestamp: entry.receivedAt,
          }));
        return (
          <Card key={`${incident.source}:${alert.athlete_id}`}>
            <p className="text-xs text-muted-foreground">
              {incident.source} · received {new Date(incident.receivedAt).toLocaleTimeString()}
            </p>
            <h3 className="mt-2 font-semibold">{alert.athlete_name}</h3>
            <p
              className={`mt-3 text-sm font-semibold ${level === "CRITICAL" ? "inline-block rounded bg-destructive px-2 py-1 text-destructive-foreground" : level === "WARNING" ? "text-warning" : "text-success"}`}
            >
              {level} · latest observed alert sample
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Heart rate</dt>
                <dd>{alert.vitals.heart_rate} bpm</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SpO₂</dt>
                <dd>{alert.vitals.spo2}%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Skin temp</dt>
                <dd>{alert.vitals.skin_temperature}°C</dd>
              </div>
            </dl>
            <VitalsChart readings={readings} />
            <p className="mt-3 text-xs text-muted-foreground">
              Sparse alert observations only; these are not a continuous vitals feed or current
              safety clearance.
            </p>
          </Card>
        );
      })}
    </div>
  );
}
function EventCommandCenter({ tournamentId, name }: { tournamentId: string; name: string }) {
  const safety = useSafetyEvents(tournamentId);
  const alarm = useSafetyAlarm(safety.unseen !== null);
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-primary">TOURNAMENT SAFETY</p>
            <h2 className="mt-2 font-semibold">{name}</h2>
          </div>
          <ConnectionStatusBadge status={safety.status} />
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Critical: heart rate above 195 bpm, SpO₂ below 90%, or skin temperature above 39.5°C.
          Warning: above 185 bpm, below 93%, or above 38.5°C respectively. Normal requires all three
          measurements within warning boundaries.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              void alarm.toggle();
            }}
          >
            {alarm.enabled ? "Mute audible alerts" : "Enable audible alerts"}
          </Button>
          <Button variant="secondary" className="whitespace-normal" onClick={safety.simulate}>
            Simulate Critical Field Emergency
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          The emergency test is a labeled local preview. It exercises the visual/audio workflow
          without sending telemetry, joining unsafe sockets, or changing any match. End-to-end
          webhook testing needs isolated staging and authorized athlete context.
        </p>
        {alarm.error && (
          <p role="status" className="mt-3 text-sm">
            {alarm.error}
          </p>
        )}
      </Card>
      {!safety.enabled && (
        <DependencyState
          title="Safety stream awaiting isolation verification"
          description="The current event gateway broadcasts sensitive safety alerts globally. Live subscriptions stay disabled until connection authentication, room authorization, and targeted broadcasting are verified."
        />
      )}
      {safety.enabled && safety.status !== "connected" && (
        <Alert danger>Stream disconnected or reconnecting. Current safety status is unknown.</Alert>
      )}
      {safety.unseen && (
        <section
          role="alert"
          className="rounded-xl border-2 border-destructive bg-destructive/10 p-5"
        >
          <p className="text-xs font-semibold text-primary">{safety.unseen.source}</p>
          <h2 className="mt-2 text-xl font-bold">MANDATORY MATCH PAUSE DIRECTIVE</h2>
          <p className="mt-3 text-sm">{safety.unseen.alert.directive}</p>
          <p className="mt-3 text-xs">
            Contact field officials and medical staff. This directive is not confirmation of a
            persisted match pause.
          </p>
        </section>
      )}
      <h2 className="text-xl font-semibold">Observed biometric alerts</h2>
      {safety.incidents.length === 0 ? (
        <Alert>
          No alert samples have been received in this browser session. This does not establish that
          all athletes are safe or that there are no outstanding incidents.
        </Alert>
      ) : (
        <IncidentWall incidents={safety.incidents} />
      )}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Incident observations · this browser session</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Latest 50 observations, held in memory. “Seen” is local only; timestamps do not confirm
          medical dispatch, match state, or durable acknowledgement.
        </p>
        {safety.incidents.length ? (
          <Table>
            <caption className="sr-only">Local incident observations and seen timestamps</caption>
            <thead>
              <tr>
                <th>Source / athlete</th>
                <th>Received</th>
                <th>Seen locally</th>
                <th>Match context</th>
              </tr>
            </thead>
            <tbody>
              {safety.incidents.map((entry) => (
                <tr key={entry.id}>
                  <td className="min-w-40">
                    {entry.source}
                    <br />
                    {entry.alert.athlete_name}
                  </td>
                  <td>{new Date(entry.receivedAt).toLocaleTimeString()}</td>
                  <td>
                    {entry.seenAt === null
                      ? "Not seen"
                      : new Date(entry.seenAt).toLocaleTimeString()}
                  </td>
                  <td>{entry.alert.match_id ?? "Not supplied"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No local observations yet.</p>
        )}
      </Card>
      <DependencyState
        title="Continuous vitals, persisted safety history and match status"
        description="An authorized active-athlete telemetry stream, durable incident history, current-match snapshot, medical-dispatch acknowledgement, and match pause/resume APIs are unavailable. This page cannot establish that a match is paused or resumed."
      />
      <CriticalAlertDialog
        incident={safety.unseen}
        onSeen={safety.markSeen}
        alarmEnabled={alarm.enabled}
        toggleAlarm={() => {
          void alarm.toggle();
        }}
      />
    </div>
  );
}
export function CommandCenter({ tournamentId }: { tournamentId: string }) {
  const { user } = useSession();
  const event = useTournament(tournamentId);
  if (event.isPending) return <Skeleton />;
  if (event.error)
    return (
      <ErrorState
        error={event.error}
        retry={() => {
          void event.refetch();
        }}
      />
    );
  if (event.data.organizerId !== user.id && user.role !== "SUPER_ADMIN")
    return (
      <DependencyState
        title="Event owner access required"
        description="Open an event owned by your account. Broader safety access requires an explicit backend authorization contract."
      />
    );
  return (
    <EventCommandCenter key={tournamentId} tournamentId={tournamentId} name={event.data.name} />
  );
}
