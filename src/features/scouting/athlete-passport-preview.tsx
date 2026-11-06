"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import {
  outreachSchema,
  type OutreachInput,
  type ScoutDossierProjection,
} from "@/contracts/scouting";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { submitOutreach } from "./api";
import { useDossier } from "./queries";
import { GtiProgressionChart } from "./gti-progression-chart";
interface OutreachActionsProps {
  userId: string;
  saved: ScoutDossierProjection["scout_outreach"];
}
function OutreachActions({ userId, saved }: OutreachActionsProps) {
  const { user } = useSession();
  const client = useQueryClient();
  const [notes, setNotes] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const operations = useRef(new Map<string, MutationOperation>());
  const flight = useRef(false);
  const mutation = useMutation({
    mutationFn: (operation: MutationOperation) => submitOutreach(userId, operation),
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["scout-dossier", user.id, userId] });
    },
  });
  function send(actionType: OutreachInput["actionType"]): void {
    if (flight.current) return;
    const parsed = outreachSchema.safeParse({ actionType, notes, organizationName });
    if (!parsed.success) {
      setValidation(parsed.error.issues.map((issue) => issue.message).join(" · "));
      return;
    }
    setValidation(null);
    flight.current = true;
    const operation = sameOperation(operations.current.get(actionType) ?? null, parsed.data);
    operations.current.set(actionType, operation);
    mutation.mutate(operation);
  }
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Academy trials and sponsorship</h2>
      <p className="mb-4 text-sm">
        {saved?.is_shortlisted ? "Bookmarked to your shortlist" : "Not yet on your shortlist"} ·{" "}
        {saved?.pipeline_status ?? "DISCOVERED"}
      </p>
      <div className="mb-5 grid gap-4">
        <label className="field">
          Organization name (optional)
          <input
            className="control"
            value={organizationName}
            maxLength={200}
            onChange={(event) => setOrganizationName(event.target.value)}
          />
        </label>
        <label className="field">
          Outreach notes (optional)
          <textarea
            className="control"
            value={notes}
            maxLength={4000}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button disabled={mutation.isPending} onClick={() => send("OFFER_TRIAL")}>
          Offer Academy Trial
        </Button>
        <Button
          disabled={mutation.isPending}
          variant="secondary"
          onClick={() => send("SPONSORSHIP_INQUIRY")}
        >
          Issue Scholarship / Sponsorship Inquiry
        </Button>
        <Button
          disabled={mutation.isPending}
          variant="secondary"
          onClick={() => send("SHORTLIST_BOOKMARK")}
        >
          Bookmark to Shortlist
        </Button>
      </div>
      {validation && (
        <p role="alert" className="mt-4">
          {validation}
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {mutation.data && (
        <p role="status" className="mt-4">
          Outreach saved to your scout record.
        </p>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Actions record your scouting workflow. An inquiry is not a confirmed trial, award, or
        delivered athlete notification.
      </p>
      <h3 className="mt-6 font-semibold">Your outreach history</h3>
      {!saved?.history.length ? (
        <p className="mt-3 text-sm">No outreach recorded yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {saved.history.map((entry, index) => (
            <li className="rounded border p-3 text-sm" key={`${entry.recordedAt}:${index}`}>
              <p>
                {entry.actionType} · {new Date(entry.recordedAt).toLocaleString()}
              </p>
              <p>{entry.organizationName}</p>
              <p className="whitespace-pre-wrap break-words">{entry.notes}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
export function AthletePassportPreview({ userId }: { userId: string }) {
  const query = useDossier(userId);
  const { user } = useSession();
  if (query.isPending) return <Skeleton />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const dossier = query.data;
  const stats = dossier.physical_stats;
  const scores = dossier.gti_breakdown;
  const wearable = dossier.wearable_summary;
  const totalMatches = dossier.sport_records.reduce((sum, record) => sum + record.total_matches, 0);
  const totalWins = dossier.sport_records.reduce((sum, record) => sum + record.win_count, 0);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Full scout dossier</h2>
        <h3 className="mt-4 font-semibold">{dossier.display_name}</h3>
        <p className="mt-2 text-sm">
          <span>{dossier.verification_status}</span> · {dossier.primary_sport ?? "Sport not set"} ·{" "}
          {dossier.district}, {dossier.state}
        </p>
        <p className="mt-3 break-all text-xs">Permanent athlete ID: {dossier.athlete_id}</p>
        <dl className="my-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt>Gender</dt>
            <dd>{stats.gender ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt>Height</dt>
            <dd>{stats.height_cm === null ? "Not recorded" : `${stats.height_cm} cm`}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{stats.weight_kg === null ? "Not recorded" : `${stats.weight_kg} kg`}</dd>
          </div>
          <div>
            <dt>Dominant side</dt>
            <dd>{stats.dominant_side ?? "Not recorded"}</dd>
          </div>
        </dl>
        <p className="text-3xl font-semibold text-primary">GTI {scores.gti.toFixed(1)}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            ["Biomechanical Form · 35%", scores.biomechanical_score],
            ["Wearable Consistency · 25%", scores.wearable_consistency_score],
            ["Verified Match Performance · 40%", scores.match_performance_score],
          ].map(([label, score]) => (
            <div key={label}>
              <dt className="text-xs">{label}</dt>
              <dd className="mt-2 font-semibold">{Number(score).toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Season-over-Season GTI Progression</h2>
        <GtiProgressionChart history={dossier.gti_history} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Verified HMAC Drill Evidence</h2>
        {!dossier.recent_drills.length ? (
          <p>No verified signed drill evidence yet.</p>
        ) : (
          <Table>
            <caption className="sr-only">Latest ten verified signed drills</caption>
            <thead>
              <tr>
                <th>Drill / sport</th>
                <th>Score / frames</th>
                <th>Flaw flags</th>
                <th>Signature prefix</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {dossier.recent_drills.map((drill) => (
                <tr key={drill.id}>
                  <td>
                    {drill.drill_type}
                    <p>{drill.sport}</p>
                  </td>
                  <td>
                    {drill.form_score.toFixed(1)} / {drill.frames_analyzed}
                  </td>
                  <td className="max-w-xs break-words">{JSON.stringify(drill.flaw_flags)}</td>
                  <td>
                    <code>{drill.signature_hash_prefix}</code>
                  </td>
                  <td>{new Date(drill.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Wearable Recovery &amp; Consistency</h2>
        <dl className="grid grid-cols-2 gap-5 text-sm">
          <div>
            <dt>Sessions monitored</dt>
            <dd>{wearable.sessions_monitored}</dd>
          </div>
          <div>
            <dt>Consistency score</dt>
            <dd>{wearable.consistency_score.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Average heart rate</dt>
            <dd>
              {wearable.avg_heart_rate === null
                ? "No readings yet"
                : `${wearable.avg_heart_rate.toFixed(1)} bpm`}
            </dd>
          </div>
          <div>
            <dt>Average SpO₂</dt>
            <dd>
              {wearable.avg_spo2 === null ? "No readings yet" : `${wearable.avg_spo2.toFixed(1)}%`}
            </dd>
          </div>
          <div>
            <dt>Recorded safety pauses</dt>
            <dd>{wearable.safety_pauses_count}</dd>
          </div>
          <div>
            <dt>Reading samples</dt>
            <dd>{wearable.readings_count}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Includes {wearable.simulator_readings} labeled simulator samples and{" "}
          {wearable.baseline_spo2_readings} SpO₂ baseline defaults. Averages cover samples recorded
          since telemetry aggregation was enabled; these observations do not establish clinical
          recovery.
        </p>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Match Podium &amp; Sport Records</h2>
        <p className="mb-4 text-sm">
          {totalWins} verified wins from {totalMatches} matches ·{" "}
          {totalMatches ? ((100 * totalWins) / totalMatches).toFixed(1) : "0.0"}% win rate
        </p>
        {!dossier.sport_records.length ? (
          <p>No verified sport records yet.</p>
        ) : (
          <ul className="space-y-3">
            {dossier.sport_records.map((record) => (
              <li className="rounded border p-4" key={record.sport}>
                <h3 className="font-semibold">
                  {record.sport} · {record.primary_role}
                </h3>
                <p className="mt-2 text-sm">
                  {record.total_matches} matches · {record.win_count} wins · streak{" "}
                  {record.win_streak}
                </p>
                <p className="mt-2 text-xs">
                  Secondary roles: {record.secondary_roles.join(", ") || "None"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {["SCOUT", "FEDERATION_ADMIN", "SUPER_ADMIN"].includes(user.role) && (
        <OutreachActions userId={userId} saved={dossier.scout_outreach} />
      )}
    </div>
  );
}
