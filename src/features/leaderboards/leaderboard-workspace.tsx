"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/features/auth/session-provider";
import { getRank } from "@/features/rankings/api";
import { SportTypeValues } from "@/contracts/enums.generated";
import { Card } from "@/components/ui/card";
import { SchemaForm } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { DependencyState } from "@/components/shared/dependency-state";
const lookupSchema = z.object({
  athleteId: z.uuid(),
  sport: z.enum(SportTypeValues),
  district: z.string().trim().max(100).optional(),
});
type RankLookup = z.infer<typeof lookupSchema>;
export function LeaderboardWorkspace() {
  const { user } = useSession();
  const [lookup, setLookup] = useState<RankLookup | null>(null);
  const rank = useQuery({
    queryKey: ["scout-rank", user.id, lookup],
    enabled: lookup !== null,
    queryFn: ({ signal }) => {
      if (!lookup) throw new Error("Select an athlete first.");
      return getRank(lookup.sport, lookup.athleteId, lookup.district, signal);
    },
  });
  return (
    <div className="space-y-6">
      <DependencyState
        title="Leaderboard lists and top-three podium"
        description="National, state and district leaderboard listing is not exposed by the backend. Ranked rows, podiums, demographic filtering and cursor pagination require explicit listing contracts. No leaderboard request is issued."
      />
      <Card>
        <h2 className="mb-4 font-semibold">Listing filters · awaiting platform support</h2>
        <fieldset disabled className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            Geographic scope
            <select className="control" defaultValue="NATIONAL">
              <option>NATIONAL</option>
              <option>STATE</option>
              <option>DISTRICT</option>
            </select>
          </label>
          <label className="field">
            Listing sport
            <select className="control">
              <option>All sports</option>
              {SportTypeValues.map((sport) => (
                <option key={sport}>{sport}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Demographic
            <select className="control">
              <option>All athletes</option>
              <option>Rural / Tier-2 & Tier-3 verified</option>
              <option>Female athletes</option>
              <option>Under-19 / Campus</option>
            </select>
          </label>
          <label className="field">
            State or district
            <input className="control" placeholder="Requires geographic listing contract" />
          </label>
        </fieldset>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Individual athlete rank lookup</h2>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">
          National and district ranks are available for a known athlete and sport. Leave district
          blank for national rank.
        </p>
        <SchemaForm
          fields={[
            { name: "athleteId", label: "Athlete UUID", required: true },
            {
              name: "sport",
              label: "Rank sport",
              type: "select",
              options: SportTypeValues,
              required: true,
            },
            { name: "district", label: "Rank district (optional)" },
          ]}
          schema={lookupSchema}
          submitLabel="Look up athlete rank"
          successMessage="Rank lookup requested."
          submit={async (value) => {
            setLookup(value);
          }}
        />
      </Card>
      {lookup &&
        (rank.isPending ? (
          <Skeleton />
        ) : rank.error ? (
          <ErrorState
            error={rank.error}
            retry={() => {
              void rank.refetch();
            }}
          />
        ) : (
          <Card>
            <h2 className="text-lg font-semibold">
              {lookup.district ? "District" : "National"} individual rank
            </h2>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-primary">
              {rank.data.rank === null ? "Unranked" : `#${rank.data.rank}`}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {lookup.sport} · {lookup.district ?? "Across India"}
            </p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{lookup.athleteId}</p>
          </Card>
        ))}
    </div>
  );
}
