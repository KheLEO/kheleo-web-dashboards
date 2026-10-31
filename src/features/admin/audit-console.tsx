"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DependencyState } from "@/components/shared/dependency-state";
const streams = {
  identity: {
    title: "Identity and anti-account-reset audit",
    description:
      "Authorized identity-event reads, immutable record identifiers, retention and duplicate-resolution outcomes are unavailable. Verification uses /auth/verify-government-id; no Gov-ID hashes or raw identity values are exposed here.",
  },
  drills: {
    title: "Edge-AI HMAC and replay audit",
    description:
      "Persistent signature failures, replay rejection logs and provenance evidence require an access-controlled audit API. Relay freshness and HMAC checks do not provide a historical ledger or prove browser metrics are truthful.",
  },
  sandbagging: {
    title: "Anti-sandbagging enforcement audit",
    description:
      "A platform-wide log of SANDBAGGING_DETECTED conflicts, attempted GTI ceilings and suggested higher tiers is unavailable. Athlete registration conflicts are not an admin audit feed.",
  },
  safety: {
    title: "Autonomous safety incident registry",
    description:
      "HealthAlert history, persisted match_paused state, medical dispatch, durable acknowledgement and immutable retention require authorized backend projections. Local seen timestamps are not a compliance or insurance ledger.",
  },
} as const;
type Stream = keyof typeof streams;
export function AuditConsole() {
  const [stream, setStream] = useState<Stream>("identity");
  return (
    <div className="space-y-6">
      <Card>
        <label className="field max-w-md">
          Audit stream
          <select
            aria-label="Audit stream"
            className="control"
            value={stream}
            onChange={(event) => setStream(event.target.value as Stream)}
          >
            {Object.entries(streams).map(([key, value]) => (
              <option key={key} value={key}>
                {value.title}
              </option>
            ))}
          </select>
        </label>
        <fieldset disabled className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="field">
            From date
            <input className="control" type="date" />
          </label>
          <label className="field">
            To date
            <input className="control" type="date" />
          </label>
          <label className="field">
            Athlete UUID
            <input className="control" />
          </label>
          <label className="field">
            Outcome
            <select className="control">
              <option>All outcomes</option>
              <option>Rejected</option>
              <option>Accepted</option>
            </select>
          </label>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Record filters are inactive until an audit listing contract exists. No entries, totals or
          successful audit actions are fabricated.
        </p>
      </Card>
      <DependencyState {...streams[stream]} />
    </div>
  );
}
