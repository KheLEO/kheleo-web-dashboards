"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { createBracketSchema, type CreateBracketRequest } from "@/contracts/tournaments";
import { sameOperation, type MutationOperation } from "@/lib/api/operation";
import { asApiError } from "@/lib/api/errors";
import { useSession } from "@/features/auth/session-provider";
import { GtiRange } from "@/features/organizer/gti-range";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { CompetitionRulesEditor } from "@/features/organizer/competition-rules-editor";
import { competitionConfigSchema } from "@/contracts/organizer";
import { useTournament, useBrackets } from "./queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import type { TournamentDetail } from "@/contracts/tournaments";
import { createBracket, updateBracket, deleteBracket } from "./api";
import { bracketFields } from "./schemas";
interface TierTemplate {
  label: string;
  defaults: CreateBracketRequest;
}
const templates: readonly TierTemplate[] = [
  {
    label: "Grassroots beginner",
    defaults: {
      name: "Grassroots Beginner",
      tierName: "TIER_3",
      minGti: 0,
      maxGti: 40,
      entryFee: 0,
      maxTeams: 16,
      bracketType: "SINGLE_ELIMINATION",
    },
  },
  {
    label: "Intermediate challenger",
    defaults: {
      name: "Intermediate Challenger",
      tierName: "TIER_2",
      minGti: 40,
      maxGti: 70,
      entryFee: 0,
      maxTeams: 16,
      bracketType: "SINGLE_ELIMINATION",
    },
  },
  {
    label: "Elite open",
    defaults: {
      name: "Elite Open",
      tierName: "TIER_1",
      minGti: 70,
      maxGti: 100,
      entryFee: 0,
      maxTeams: 16,
      bracketType: "SINGLE_ELIMINATION",
    },
  },
];
interface DraftTier {
  id: string;
  template: TierTemplate;
}
function TierEditor({
  tournamentId,
  template,
  remove,
  existingId,
  tournament,
  onSaved,
}: {
  tournamentId: string;
  template: TierTemplate;
  remove: () => void;
  existingId?: string;
  tournament: TournamentDetail;
  onSaved: (created: boolean) => void;
}) {
  const { user } = useSession();
  const client = useQueryClient();
  const { register, control, getValues, setValue } = useForm<CreateBracketRequest>({
    defaultValues: template.defaults,
  });
  const values = useWatch({ control });
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const [pending, setPending] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(existingId ?? null);
  const [error, setError] = useState<string | null>(null);
  async function save(): Promise<void> {
    if (flight.current) return;
    const parsed = createBracketSchema.safeParse(getValues());
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(" · "));
      return;
    }
    if (
      parsed.data.config?.roleQuotas &&
      Object.values(parsed.data.config.roleQuotas).reduce((sum, count) => sum + count, 0) !==
        tournament.teamSize
    ) {
      setError("Role quotas must total the tournament team size.");
      return;
    }
    flight.current = true;
    setPending(true);
    setError(null);
    try {
      operation.current = sameOperation(operation.current, parsed.data);
      const result = savedId
        ? await updateBracket(tournamentId, savedId, operation.current)
        : await createBracket(tournamentId, operation.current);
      setSavedId(result.id);
      onSaved(!savedId);
      if (!existingId) remove();
      void client.invalidateQueries({ queryKey: ["brackets", user.id, tournamentId] });
      void client.invalidateQueries({ queryKey: ["tournament", user.id, tournamentId] });
    } catch (failure: unknown) {
      setError(asApiError(failure).message);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  return (
    <Card>
      <form
        aria-label={template.label}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-5"
      >
        <h3 className="font-semibold">{template.label}</h3>
        <fieldset disabled={pending} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {bracketFields
              .filter((field) => !["minGti", "maxGti"].includes(field.name))
              .map((field) => {
                const name = field.name as keyof CreateBracketRequest;
                return (
                  <label className="field" key={name}>
                    {field.label}
                    {field.type === "select" ? (
                      <select className="control" aria-label={field.label} {...register(name)}>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={field.label}
                        className="control"
                        type={field.type ?? "text"}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? (field.type === "number" ? "any" : undefined)}
                        required={field.required}
                        {...register(name, { valueAsNumber: field.valueType === "number" })}
                      />
                    )}
                    {field.hint && (
                      <span className="text-xs text-muted-foreground">{field.hint}</span>
                    )}
                  </label>
                );
              })}
          </div>
          <GtiRange
            floor={values.minGti ?? 0}
            ceiling={values.maxGti ?? 100}
            onFloor={(value) => setValue("minGti", value)}
            onCeiling={(value) => setValue("maxGti", value)}
          />
          <CompetitionRulesEditor
            value={values.config as CreateBracketRequest["config"]}
            onChange={(config) => setValue("config", config, { shouldDirty: true })}
            sport={tournament.sport}
            teamSize={tournament.teamSize}
          />
        </fieldset>
        {error && <Alert danger>{error}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : savedId ? "Save bracket changes" : "Create bracket"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={async () => {
              if (!savedId) {
                remove();
                return;
              }
              if (flight.current || !window.confirm(`Delete ${template.defaults.name}?`)) return;
              flight.current = true;
              setPending(true);
              try {
                operation.current = sameOperation(operation.current, {});
                await deleteBracket(tournamentId, savedId, operation.current);
                void client.invalidateQueries({ queryKey: ["brackets", user.id, tournamentId] });
                void client.invalidateQueries({ queryKey: ["tournament", user.id, tournamentId] });
                onSaved(false);
                remove();
              } catch (failure: unknown) {
                setError(asApiError(failure).message);
              } finally {
                flight.current = false;
                setPending(false);
              }
            }}
          >
            {savedId ? "Delete bracket" : "Remove unsaved tier"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
export function BracketForm({
  tournamentId,
  showSaved = true,
}: {
  tournamentId: string;
  showSaved?: boolean;
}) {
  const query = useTournament(tournamentId);
  const brackets = useBrackets(tournamentId);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<DraftTier[]>([{ id: "initial", template: templates[0]! }]);
  if (query.isPending) return <Skeleton />;
  if (query.error) return <ErrorState error={query.error} />;
  const tournament = query.data;
  return (
    <div className="space-y-6">
      {notice && <p role="status">{notice}</p>}
      {showSaved && (
        <section aria-label="Saved bracket editors" className="space-y-5">
          <h2 className="text-xl font-semibold">Edit saved brackets</h2>
          {brackets.error && <ErrorState error={brackets.error} />}
          {brackets.data?.pages
            .flatMap((page) => page.data)
            .map((bracket) => (
              <TierEditor
                key={bracket.id}
                existingId={bracket.id}
                tournamentId={tournamentId}
                tournament={tournament}
                template={{
                  label: bracket.name,
                  defaults: {
                    name: bracket.name,
                    tierName: bracket.tierName,
                    minGti: Number(bracket.minGti),
                    maxGti: Number(bracket.maxGti),
                    entryFee: Number(bracket.entryFee),
                    maxTeams: bracket.maxTeams,
                    bracketType: bracket.bracketType,
                    config: competitionConfigSchema.parse(bracket.config),
                  },
                }}
                onSaved={() => setNotice("Bracket saved")}
                remove={() => undefined}
              />
            ))}
          <LoadMore
            hasNext={brackets.hasNextPage}
            loading={brackets.isFetchingNextPage}
            load={() => {
              void brackets.fetchNextPage();
            }}
          />
        </section>
      )}
      <Card>
        <h2 className="mb-3 text-xl font-semibold">Build competition tiers</h2>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">
          Add and adjust drafts before saving each tier. Templates are suggestions; shared GTI
          boundaries are inclusive. Review eligibility for your event.
        </p>
        <div className="flex flex-wrap gap-3">
          {templates.map((template) => (
            <Button
              type="button"
              variant="secondary"
              key={template.label}
              disabled={drafts.length >= 10}
              onClick={() =>
                setDrafts((current) => [...current, { id: crypto.randomUUID(), template }])
              }
            >
              Add {template.label.toLowerCase()}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          At most 10 tier editors per session. Each save is independent; failed saves retain their
          operation key for explicit retry.
        </p>
      </Card>
      {drafts.map((draft) => (
        <TierEditor
          key={draft.id}
          tournamentId={tournamentId}
          template={draft.template}
          tournament={tournament}
          onSaved={(created) => setNotice(created ? "Bracket created" : "Bracket saved")}
          remove={() => setDrafts((current) => current.filter((entry) => entry.id !== draft.id))}
        />
      ))}
      <Alert>
        Entry fees and prizes are configuration only. Custom role quotas must match the event team
        size and are used by the matchmaker before sport defaults.
      </Alert>
    </div>
  );
}
