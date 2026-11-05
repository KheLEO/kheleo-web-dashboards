"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { ConnectionStatusBadge } from "@/components/shared/connection-status";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { useSession } from "@/features/auth/session-provider";
import { useTournament } from "@/features/tournaments/queries";
import { acknowledgeSafetySchema, type HealthAlert, type AthleteVitals } from "@/contracts/safety";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { useSafetyEvents } from "./use-safety-events";
import { useSafetyAlarm } from "./use-safety-alarm";
import { useTournamentVitals, useSafetyHistory } from "./use-safety-data";
import { acknowledgeSafety } from "./api";
import { CriticalAlertDialog } from "./critical-alert-dialog";
import type { SafetyIncident } from "./alert-reducer";
interface AckAction {
  id: string;
  operation: MutationOperation;
}
function incidentFromAlert(alert: HealthAlert, name: string): SafetyIncident {
  return {
    id: alert.id,
    source: alert.source === "SIMULATOR" ? "SIMULATED" : "LIVE",
    receivedAt: Date.parse(alert.createdAt),
    seenAt: null,
    alert: {
      event: "MATCH_PAUSE_ALERT",
      severity: "CRITICAL",
      alert_id: alert.id,
      athlete_id: alert.athleteId,
      athlete_name: name,
      vitals: {
        heart_rate: alert.heartRate,
        spo2: alert.spo2,
        skin_temperature: alert.skinTemperature,
      },
      directive: alert.triggerReason,
      ...(alert.matchId ? { match_id: alert.matchId } : {}),
      ...(alert.tournamentId ? { tournament_id: alert.tournamentId } : {}),
      ...(alert.bracketId ? { bracket_id: alert.bracketId } : {}),
    },
  };
}
function PlayerVital({ reading }: { reading: AthleteVitals }) {
  const color =
    reading.severity === "CRITICAL"
      ? "border-destructive bg-destructive/15"
      : reading.severity === "WARNING"
        ? "border-warning bg-warning/10"
        : reading.severity === "NORMAL"
          ? "border-success bg-success/10"
          : "border-border";
  return (
    <section
      aria-label={`Vitals for ${reading.name}`}
      className={`relative rounded-xl border-2 p-5 ${color}`}
    >
      {reading.severity === "CRITICAL" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-destructive motion-safe:animate-pulse"
        />
      )}
      <h3 className="break-words font-semibold">{reading.name}</h3>
      <p className="my-3 text-sm font-semibold">{reading.severity.replaceAll("_", " ")}</p>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt>Heart rate</dt>
          <dd>{reading.heart_rate === null ? "Awaiting reading" : `${reading.heart_rate} bpm`}</dd>
        </div>
        <div>
          <dt>SpO₂</dt>
          <dd>{reading.spo2 === null ? "Awaiting reading" : `${reading.spo2}%`}</dd>
        </div>
        <div>
          <dt>Temperature</dt>
          <dd>
            {reading.skin_temperature === null
              ? "Awaiting reading"
              : `${reading.skin_temperature}°C`}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs">
        {reading.source ?? "No source yet"}
        {reading.baseline_fields.length
          ? ` · baseline defaults: ${reading.baseline_fields.join(", ")}`
          : ""}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {reading.observedAt
          ? `Observed ${new Date(reading.observedAt).toLocaleString()}`
          : "No telemetry has been received for this athlete."}
      </p>
      {reading.matchId && (
        <p className="mt-3 break-all text-xs">
          Match {reading.matchId} · {reading.matchStatus}
        </p>
      )}
    </section>
  );
}
function EventCommandCenter({ tournamentId, name }: { tournamentId: string; name: string }) {
  const client = useQueryClient();
  const { user } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vitals = useTournamentVitals(tournamentId);
  const history = useSafetyHistory(tournamentId);
  const refresh = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      for (const key of ["safety-vitals", "safety-history", "organizer-summary"])
        void client.invalidateQueries({ queryKey: [key, user.id] });
    }, 500);
  }, [client, user.id]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const safety = useSafetyEvents(tournamentId, refresh);
  const readings = [
    ...new Map(
      vitals.data?.pages
        .flatMap((page) => page.data)
        .map((reading) => [reading.athleteId, reading]) ?? [],
    ).values(),
  ];
  const matches = [
    ...new Map(
      vitals.data?.pages.flatMap((page) => page.matches).map((match) => [match.id, match]) ?? [],
    ).values(),
  ];
  const alerts = [
    ...new Map(
      [
        ...(history.data?.pages.flatMap((page) => page.data) ?? []),
        ...(vitals.data?.pages.flatMap((page) => page.activeAlerts) ?? []),
      ].map((alert) => [alert.id, alert]),
    ).values(),
  ];
  const [focused, setFocused] = useState<SafetyIncident | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const operations = useRef(new Map<string, MutationOperation>());
  const active = alerts.find(
    (alert) => alert.severity === "CRITICAL" && !alert.acknowledgedAt && !dismissed.has(alert.id),
  );
  const persisted = active
    ? incidentFromAlert(
        active,
        readings.find((reading) => reading.athleteId === active.athleteId)?.name ??
          active.athleteId,
      )
    : null;
  const incident = safety.unseen ?? focused ?? persisted;
  const alarm = useSafetyAlarm(incident !== null);
  const ack = useMutation({
    mutationFn: (action: AckAction) => acknowledgeSafety(action.id, action.operation),
    onSuccess: refresh,
  });
  const markSeen = (): void => {
    if (incident) setDismissed((previous) => new Set([...previous, incident.id]));
    safety.markSeen();
    setFocused(null);
  };
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
          Critical: HR above 195 bpm, SpO₂ below 90%, or temperature above 39.5°C. Warning: above
          185 bpm, below 93%, or above 38.5°C. Readings show their observation time and source.
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
        <p className="mt-4 text-xs text-muted-foreground">
          The emergency preview runs locally. Streaming telemetry and recorded medical checks use
          the server.
        </p>
        {alarm.error && (
          <p role="status" className="mt-3 text-sm">
            {alarm.error}
          </p>
        )}
      </Card>
      {safety.status !== "connected" && (
        <Alert danger>
          Stream disconnected or reconnecting. Showing the latest persisted observations.
        </Alert>
      )}
      <h2 className="text-xl font-semibold">All-Player Biometric Wall</h2>
      {vitals.isPending ? (
        <Skeleton />
      ) : vitals.error ? (
        <ErrorState
          error={vitals.error}
          retry={() => {
            void vitals.refetch();
          }}
        />
      ) : !readings.length ? (
        <EmptyState>No active registered athletes in this tournament yet.</EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {readings.map((reading) => (
            <PlayerVital key={reading.athleteId} reading={reading} />
          ))}
        </div>
      )}
      <LoadMore
        hasNext={vitals.hasNextPage}
        loading={vitals.isFetchingNextPage}
        load={() => {
          void vitals.fetchNextPage();
        }}
      />
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Current match states</h2>
        {!matches.length ? (
          <p className="text-sm">No active matches.</p>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div className="rounded border p-4" key={match.id}>
                <p className="break-all text-sm">
                  Match {match.id} · <strong>{match.status}</strong>
                </p>
                {match.pauseReason && <p className="mt-2 text-sm">{match.pauseReason}</p>}
                {match.status === "PAUSED_SAFETY" && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() => {
                      const alert = alerts.find((entry) => entry.matchId === match.id);
                      if (alert)
                        setFocused(
                          incidentFromAlert(
                            alert,
                            readings.find((reading) => reading.athleteId === alert.athleteId)
                              ?.name ?? alert.athleteId,
                          ),
                        );
                      else
                        setValidation(
                          "Load incident history to review the medical clearance for this match.",
                        );
                    }}
                  >
                    Review medical clearance
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-xl font-semibold">Persisted incident history</h2>
        <label className="field mb-5">
          Incident medical-check note
          <textarea
            className="control"
            value={note}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {history.isPending ? (
          <Skeleton />
        ) : history.error ? (
          <ErrorState error={history.error} />
        ) : !history.data?.pages.flatMap((page) => page.data).length ? (
          <EmptyState>No persisted incidents for this tournament.</EmptyState>
        ) : (
          <Table>
            <caption className="sr-only">Persisted health alerts and medical checks</caption>
            <thead>
              <tr>
                <th>Athlete / source</th>
                <th>Severity</th>
                <th>Recorded</th>
                <th>Medical check</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.data.pages
                .flatMap((page) => page.data)
                .map((alert) => (
                  <tr key={alert.id}>
                    <td className="break-all">
                      {readings.find((reading) => reading.athleteId === alert.athleteId)?.name ??
                        alert.athleteId}
                      <p>{alert.source}</p>
                    </td>
                    <td>{alert.severity}</td>
                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                    <td>
                      {alert.acknowledgedAt ? (
                        <>
                          {new Date(alert.acknowledgedAt).toLocaleString()}
                          <p>{alert.medicalCheckNote}</p>
                        </>
                      ) : (
                        "Awaiting acknowledgement"
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-3">
                        {alert.severity === "CRITICAL" && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setFocused(
                                incidentFromAlert(
                                  alert,
                                  readings.find((reading) => reading.athleteId === alert.athleteId)
                                    ?.name ?? alert.athleteId,
                                ),
                              )
                            }
                          >
                            Review incident
                          </Button>
                        )}
                        {!alert.acknowledgedAt && (
                          <Button
                            disabled={ack.isPending}
                            variant="ghost"
                            onClick={() => {
                              const parsed = acknowledgeSafetySchema.safeParse({
                                medicalCheckNote: note,
                                medicalCheckDispatched: true,
                              });
                              if (!parsed.success) {
                                setValidation(
                                  "Enter a medical-check note of at least five characters.",
                                );
                                return;
                              }
                              setValidation(null);
                              const operation = sameOperation(
                                operations.current.get(alert.id) ?? null,
                                parsed.data,
                              );
                              operations.current.set(alert.id, operation);
                              ack.mutate({ id: alert.id, operation });
                            }}
                          >
                            Acknowledge incident
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
        <LoadMore
          hasNext={history.hasNextPage}
          loading={history.isFetchingNextPage}
          load={() => {
            void history.fetchNextPage();
          }}
        />
        {validation && <Alert danger>{validation}</Alert>}
        {ack.error && <ErrorState error={ack.error} />}
      </Card>
      {safety.incidents.filter((entry) => !entry.alert.alert_id).length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold">Local emergency previews</h2>
          <Table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Received</th>
                <th>Seen locally</th>
              </tr>
            </thead>
            <tbody>
              {safety.incidents
                .filter((entry) => !entry.alert.alert_id)
                .map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.source}</td>
                    <td>{new Date(entry.receivedAt).toLocaleTimeString()}</td>
                    <td>
                      {entry.seenAt ? new Date(entry.seenAt).toLocaleTimeString() : "Not seen"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Card>
      )}
      <CriticalAlertDialog
        key={incident?.id ?? "none"}
        incident={incident}
        onSeen={markSeen}
        alarmEnabled={alarm.enabled}
        toggleAlarm={() => {
          void alarm.toggle();
        }}
        onUpdated={() => {
          if (incident) setFocused(incident);
          refresh();
        }}
        acknowledged={Boolean(
          alerts.find((alert) => alert.id === incident?.alert.alert_id)?.acknowledgedAt,
        )}
        matchPaused={matches.some(
          (match) => match.id === incident?.alert.match_id && match.status === "PAUSED_SAFETY",
        )}
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
  if (user.role === "ORGANIZER" && event.data.organizerId !== user.id)
    return <Alert danger>Access restricted: this safety wall belongs to another organizer.</Alert>;
  return (
    <EventCommandCenter key={tournamentId} tournamentId={tournamentId} name={event.data.name} />
  );
}
