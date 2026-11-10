"use client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useSession } from "@/features/auth/session-provider";
import { getRank } from "@/features/rankings/api";
import { SportTypeValues } from "@/contracts/enums.generated";
import { Card } from "@/components/ui/card";
import { SchemaForm } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { Alert } from "@/components/ui/alert";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadMore } from "@/components/shared/cursor-list";
import { ScoutDossierModal } from "@/components/scout/ScoutDossierModal";
import {
  leaderboardQuerySchema,
  type LeaderboardQuery,
  type LeaderboardEntry,
} from "@/contracts/gti";
import { useLeaderboards } from "./queries";
import { useRegional } from "@/features/regional/queries";
import { INDIA_STATES, getDistrictsForState } from "@/lib/india-locations";
const lookupSchema = z.object({
  athleteId: z.uuid(),
  sport: z.enum(SportTypeValues),
  district: z.string().trim().max(100).optional(),
});
type RankLookup = z.infer<typeof lookupSchema>;
function AthleteRankingRow({ athlete }: { athlete: LeaderboardEntry }) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <tr
      className="cursor-pointer hover:bg-muted/50"
      onClick={(event) => {
        if (!(event.target instanceof Element) || event.target.closest("button")) return;
        trigger.current?.click();
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          trigger.current?.click();
        }
      }}
    >
      <td>#{athlete.rank}</td>
      <td>
        <ScoutDossierModal
          triggerRef={trigger}
          userId={athlete.athlete_id}
          label={athlete.display_name}
        />
      </td>
      <td>
        {athlete.district}, {athlete.state}
        <p className="text-xs">
          {athlete.tier_classification} · {athlete.gender ?? "Not specified"}
        </p>
      </td>
      <td>
        {athlete.primary_sport} · {athlete.primary_role ?? "No role"}
      </td>
      <td className="tabular-nums">{athlete.gti.toFixed(1)}</td>
      <td>
        {athlete.total_matches} matches · {athlete.win_rate.toFixed(1)}% wins
      </td>
    </tr>
  );
}
export function LeaderboardWorkspace() {
  const { user } = useSession();
  const [scope, setScope] = useState<LeaderboardQuery["scope"]>("NATIONAL");
  const [sport, setSport] = useState<NonNullable<LeaderboardQuery["sport"]>>("ALL");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [demographic, setDemographic] = useState("ALL");
  const regions = useRegional();
  const selected = leaderboardQuerySchema.safeParse({
    scope,
    sport,
    limit: 20,
    ...(scope !== "NATIONAL" && state ? { state } : {}),
    ...(scope === "DISTRICT" && district ? { district } : {}),
    ...(demographic === "RURAL" ? { tier: "RURAL_AND_TIER_2_3" } : {}),
    ...(demographic === "FEMALE" ? { gender: "FEMALE" } : {}),
  });
  const query = useLeaderboards(selected.success ? selected.data : null);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const podium = query.data?.pages[0]?.data.slice(0, 3) ?? [];
  const states = [
    ...new Set([...INDIA_STATES, ...(regions.data?.data.map((row) => row.state) ?? [])]),
  ].sort();
  const stateDistricts = getDistrictsForState(state);
  const regionDistricts =
    regions.data?.data.filter((row) => row.state === state).map((row) => row.district) ?? [];
  const districts = [...new Set([...stateDistricts, ...regionDistricts])].sort();

  const [draftLookup, setLookup] = useState<RankLookup | null>(null);
  const lookup = useDebouncedValue(draftLookup, 300);
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
      <Card>
        <h2 className="mb-5 text-xl font-semibold">GTI leaderboards</h2>
        <div role="group" aria-label="Leaderboard scope" className="mb-5 flex flex-wrap gap-3">
          {(["NATIONAL", "STATE", "DISTRICT"] as const).map((value) => (
            <Button
              key={value}
              variant={scope === value ? "primary" : "secondary"}
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field">
            Listing sport
            <select
              aria-label="Listing sport"
              className="control"
              value={sport}
              onChange={(event) => {
                const parsed = leaderboardQuerySchema.shape.sport.safeParse(event.target.value);
                if (parsed.success && parsed.data) setSport(parsed.data);
              }}
            >
              <option value="ALL">All sports</option>
              {SportTypeValues.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Demographic
            <select
              aria-label="Demographic"
              className="control"
              value={demographic}
              onChange={(event) => setDemographic(event.target.value)}
            >
              <option value="ALL">All athletes</option>
              <option value="RURAL">Rural / Tier-2 & Tier-3</option>
              <option value="FEMALE">Female Athletes</option>
            </select>
          </label>
          {scope !== "NATIONAL" && (
            <label className="field">
              State
              <input
                className="control"
                aria-label="Leaderboard state"
                list="leaderboard-states"
                value={state}
                onChange={(event) => {
                  setState(event.target.value);
                  setDistrict("");
                }}
              />
              <datalist id="leaderboard-states">
                {states.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
          )}
          {scope === "DISTRICT" && (
            <label className="field">
              District
              <input
                className="control"
                aria-label="Leaderboard district"
                list="leaderboard-districts"
                value={district}
                disabled={!state}
                placeholder={!state ? "Select a state first..." : undefined}
                onChange={(event) => setDistrict(event.target.value)}
              />
              <datalist id="leaderboard-districts">
                {districts.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </label>
          )}
        </div>
        {!selected.success && (
          <p role="status" className="mt-4">
            Choose a state{scope === "DISTRICT" ? " and district" : ""} to load this scope.
          </p>
        )}
        {regions.error && scope !== "NATIONAL" && (
          <p className="mt-3 text-sm">
            Geographic suggestions could not load. Enter the state and district names directly.
          </p>
        )}
      </Card>
      {selected.success &&
        (query.isPending ? (
          <Skeleton />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <>
            <Card>
              <h2 className="mb-5 text-xl font-semibold">Top-three podium</h2>
              {!podium.length ? (
                <p>No eligible athletes match these filters.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {podium.map((athlete, index) => (
                    <section
                      key={athlete.athlete_id}
                      aria-label={`Podium rank ${athlete.rank}`}
                      className={`min-w-0 rounded-lg border p-5 ${index === 0 ? "border-primary bg-primary/10" : index === 1 ? "border-destructive bg-destructive/10" : "border-muted-foreground bg-muted"}`}
                    >
                      <p className="text-3xl font-semibold">#{athlete.rank}</p>
                      <h3 className="mt-3 font-semibold">{athlete.display_name}</h3>
                      <p className="my-3 text-sm">
                        {athlete.district}, {athlete.state} · GTI {athlete.gti.toFixed(1)}
                      </p>
                      <ScoutDossierModal
                        userId={athlete.athlete_id}
                        label={`Inspect #${athlete.rank}`}
                      />
                    </section>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">
                {scope} rankings · {query.data?.pages[0]?.total ?? 0} eligible athletes
              </h2>
              <Table>
                <caption className="sr-only">Scoped GTI leaderboard</caption>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Athlete</th>
                    <th>District / state</th>
                    <th>Sport / role</th>
                    <th>GTI</th>
                    <th>Match record</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((athlete) => (
                    <AthleteRankingRow key={athlete.athlete_id} athlete={athlete} />
                  ))}
                </tbody>
              </Table>
              <LoadMore
                hasNext={query.hasNextPage}
                loading={query.isFetchingNextPage}
                load={() => {
                  void query.fetchNextPage();
                }}
              />
            </Card>
            <Alert>
              Ranks are specific to the selected scope and filters. Only active, verified athletes
              opted into discovery are listed.
            </Alert>
          </>
        ))}
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
