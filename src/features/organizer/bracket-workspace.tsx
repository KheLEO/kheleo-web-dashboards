"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { useTournament, useBrackets } from "@/features/tournaments/queries";
import { TournamentDetailView } from "@/features/tournaments/tournament-detail";
import { BracketForm } from "@/features/tournaments/bracket-form";
import { useSession } from "@/features/auth/session-provider";
import { useRegistrations, usePool, useSandbaggingLogs } from "./queries";
import { processPool, recordMatchResult } from "./api";
import { recordMatchResultSchema } from "@/contracts/organizer";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
interface BracketPanelProps {
  tournamentId: string;
  bracketId: string;
}
function RegistrationsInspector({ tournamentId, bracketId }: BracketPanelProps) {
  const query = useRegistrations(tournamentId, bracketId);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Verified Roster & Registrations Inspector</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : !rows.length ? (
        <EmptyState>No registrations in this bracket yet.</EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Registered teams and athlete verification</caption>
          <thead>
            <tr>
              <th>Team / registration</th>
              <th>Athlete</th>
              <th>GTI</th>
              <th>Identity</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((registration) =>
              registration.athletes.map((athlete) => (
                <tr key={`${registration.id}:${athlete.userId}`}>
                  <td>
                    {registration.teamName ?? "Individual entry"}
                    <p className="text-xs">{registration.status}</p>
                  </td>
                  <td>
                    {athlete.name}
                    <p className="break-all text-xs">{athlete.userId}</p>
                  </td>
                  <td>{athlete.gti === null ? "Profile incomplete" : athlete.gti.toFixed(1)}</td>
                  <td>
                    {athlete.identityStatus}
                    {!athlete.isActive && " · inactive"}
                  </td>
                  <td>{athlete.role.replaceAll("_", " ")}</td>
                </tr>
              )),
            )}
          </tbody>
        </Table>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
    </Card>
  );
}
function QueueMonitor({ tournamentId, bracketId }: BracketPanelProps) {
  const query = usePool(tournamentId, bracketId);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  const client = useQueryClient();
  const { user } = useSession();
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const mutation = useMutation({
    mutationFn: (action: MutationOperation) => processPool(tournamentId, bracketId, action),
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      operation.current = null;
      for (const key of ["organizer-pool", "organizer-registrations", "organizer-summary"])
        void client.invalidateQueries({ queryKey: [key, user.id] });
    },
  });
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Free-Agent Pool Queue Monitor</h2>
      <Button
        disabled={mutation.isPending}
        onClick={() => {
          if (flight.current) return;
          flight.current = true;
          operation.current = sameOperation(operation.current, {});
          mutation.mutate(operation.current);
        }}
      >
        Trigger Matchmaker
      </Button>
      {mutation.data && (
        <p role="status" className="my-4">
          {mutation.data.formed
            ? "Eligible teams formed. Registrations and queue updated."
            : "No complete eligible roster can be formed from the current queue."}
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : !rows.length ? (
        <EmptyState>No queued free agents in this bracket.</EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Queued athletes by role</caption>
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Primary role</th>
              <th>Secondary role</th>
              <th>GTI / identity</th>
              <th>Queued since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.primaryRole}</td>
                <td>{row.secondaryRole ?? "None"}</td>
                <td>
                  {row.gti?.toFixed(1) ?? "Profile incomplete"} · {row.identityStatus}
                </td>
                <td>{new Date(row.joinedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
    </Card>
  );
}
function FairPlayLog({ tournamentId }: { tournamentId: string }) {
  const query = useSandbaggingLogs(tournamentId);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Anti-Sandbagging Fair-Play Block Log</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : !rows.length ? (
        <EmptyState>No sandbagging blocks recorded for this event.</EmptyState>
      ) : (
        <Table>
          <caption className="sr-only">Persisted fair-play block attempts</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>Athlete ID</th>
              <th>Decision</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td className="break-all">{row.userId ?? "Account not linked"}</td>
                <td>{row.action}</td>
                <td>
                  <pre className="max-w-md whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(row.metadata, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
    </Card>
  );
}
function MatchScoring({ tournamentId, bracketId }: BracketPanelProps) {
  const query = useRegistrations(tournamentId, bracketId);
  const client = useQueryClient();
  const { user } = useSession();
  const athletes = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.data.flatMap((row) => row.athletes))
        .map((athlete) => [athlete.userId, athlete]) ?? [],
    ).values(),
  ];
  const [outcomes, setOutcomes] = useState<Record<string, "winner" | "loser" | "">>({});
  const [matchName, setMatchName] = useState("");
  const [score, setScore] = useState("");
  const [matchId, setMatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const mutation = useMutation({
    mutationFn: (action: MutationOperation) => recordMatchResult(tournamentId, bracketId, action),
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      operation.current = null;
      void client.invalidateQueries({ queryKey: ["organizer-registrations", user.id] });
      void client.invalidateQueries({ queryKey: ["organizer-summary", user.id] });
    },
  });
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">Match Result & Score Verification Form</h2>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (flight.current) return;
            const parsed = recordMatchResultSchema.safeParse({
              matchName,
              scoreSummary: { summary: score },
              winnerAthleteIds: Object.keys(outcomes).filter((id) => outcomes[id] === "winner"),
              loserAthleteIds: Object.keys(outcomes).filter((id) => outcomes[id] === "loser"),
              ...(matchId.trim() ? { matchId: matchId.trim() } : {}),
            });
            if (!parsed.success) {
              setError(parsed.error.issues.map((issue) => issue.message).join(" · "));
              return;
            }
            setError(null);
            flight.current = true;
            operation.current = sameOperation(operation.current, parsed.data);
            mutation.mutate(operation.current);
          }}
        >
          <label className="field">
            Match name
            <input
              className="control"
              value={matchName}
              required
              minLength={3}
              onChange={(event) => {
                setMatchName(event.target.value);
                mutation.reset();
              }}
            />
          </label>
          <label className="field">
            Score summary
            <textarea
              className="control"
              value={score}
              required
              onChange={(event) => {
                setScore(event.target.value);
                mutation.reset();
              }}
            />
          </label>
          <label className="field">
            Match ID (optional)
            <input
              className="control"
              value={matchId}
              onChange={(event) => {
                setMatchId(event.target.value);
                mutation.reset();
              }}
            />
          </label>
          <fieldset>
            <legend className="mb-3 font-semibold">
              Select winners and losers from registered athletes
            </legend>
            <div className="space-y-3">
              {athletes.map((athlete) => (
                <label className="field" key={athlete.userId}>
                  {athlete.name}
                  <select
                    className="control"
                    aria-label={`Result for ${athlete.name}`}
                    value={outcomes[athlete.userId] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "winner" || value === "loser" || value === "")
                        setOutcomes((previous) => ({ ...previous, [athlete.userId]: value }));
                      mutation.reset();
                    }}
                  >
                    <option value="">Not in this match</option>
                    <option value="winner">Winner</option>
                    <option value="loser">Loser</option>
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <LoadMore
            hasNext={query.hasNextPage}
            loading={query.isFetchingNextPage}
            load={() => {
              void query.fetchNextPage();
            }}
          />
          {error && <Alert danger>{error}</Alert>}
          {mutation.error && <ErrorState error={mutation.error} />}
          {mutation.data && (
            <p role="status">Result verified. Match-performance scores and GTI updates queued.</p>
          )}
          <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
            Record verified result
          </Button>
        </form>
      )}
    </Card>
  );
}
export function BracketWorkspace({ tournamentId }: { tournamentId: string }) {
  const event = useTournament(tournamentId);
  const brackets = useBrackets(tournamentId);
  const { user } = useSession();
  const [chosen, setChosen] = useState("");
  if (event.isPending) return <Skeleton />;
  if (event.error) return <ErrorState error={event.error} />;
  if (user.role === "ORGANIZER" && event.data.organizerId !== user.id)
    return <Alert danger>Access restricted: you do not own this tournament.</Alert>;
  const rows = brackets.data?.pages.flatMap((page) => page.data) ?? [];
  const bracketId = rows.some((row) => row.id === chosen) ? chosen : rows[0]?.id || "";
  return (
    <div className="space-y-6">
      <TournamentDetailView tournamentId={tournamentId} area="organizer" />
      {brackets.error ? (
        <ErrorState error={brackets.error} />
      ) : !bracketId ? (
        <EmptyState>Create a bracket to manage registrations and match results.</EmptyState>
      ) : (
        <>
          <label className="field">
            Management bracket
            <select
              className="control"
              value={bracketId}
              onChange={(event) => setChosen(event.target.value)}
            >
              {rows.map((bracket) => (
                <option key={bracket.id} value={bracket.id}>
                  {bracket.name}
                </option>
              ))}
            </select>
          </label>
          <Tabs.Root defaultValue="registrations" key={bracketId}>
            <Tabs.List aria-label="Bracket management panels" className="mb-5 flex flex-wrap gap-3">
              {[
                ["registrations", "Verified Roster & Registrations Inspector"],
                ["queue", "Free-Agent Pool Queue Monitor"],
                ["fair-play", "Anti-Sandbagging Fair-Play Block Log"],
                ["results", "Match Result & Score Verification Form"],
              ].map(([value, label]) => (
                <Tabs.Trigger
                  key={value}
                  value={value ?? ""}
                  className="rounded border px-4 py-3 text-sm data-[state=active]:border-primary data-[state=active]:text-primary"
                >
                  {label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="registrations">
              <RegistrationsInspector tournamentId={tournamentId} bracketId={bracketId} />
            </Tabs.Content>
            <Tabs.Content value="queue">
              <QueueMonitor tournamentId={tournamentId} bracketId={bracketId} />
            </Tabs.Content>
            <Tabs.Content value="fair-play">
              <FairPlayLog tournamentId={tournamentId} />
            </Tabs.Content>
            <Tabs.Content value="results">
              <MatchScoring tournamentId={tournamentId} bracketId={bracketId} />
            </Tabs.Content>
          </Tabs.Root>
        </>
      )}
      <details className="rounded-lg border p-5">
        <summary className="cursor-pointer font-semibold">Manage bracket configuration</summary>
        <div className="mt-5">
          <BracketForm tournamentId={tournamentId} />
        </div>
      </details>
    </div>
  );
}
