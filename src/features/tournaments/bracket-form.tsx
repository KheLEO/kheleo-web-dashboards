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
import { createBracket } from "./api";
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
}: {
  tournamentId: string;
  template: TierTemplate;
  remove: () => void;
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
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function save(): Promise<void> {
    if (flight.current || savedId) return;
    const parsed = createBracketSchema.safeParse(getValues());
    if (!parsed.success) {
      setError(parsed.error.issues.map((issue) => issue.message).join(" · "));
      return;
    }
    flight.current = true;
    setPending(true);
    setError(null);
    try {
      operation.current = sameOperation(operation.current, parsed.data);
      const result = await createBracket(tournamentId, operation.current);
      setSavedId(result.id);
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
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-5"
      >
        <h3 className="font-semibold">{template.label}</h3>
        <fieldset disabled={pending || savedId !== null} className="space-y-5">
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
        </fieldset>
        {error && <Alert danger>{error}</Alert>}
        {savedId ? (
          <Alert>
            Bracket created. Reference: <span className="break-all">{savedId}</span>. Editing and
            deletion need platform support.
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create bracket"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={remove}>
              Remove unsaved tier
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
export function BracketForm({ tournamentId }: { tournamentId: string }) {
  const [drafts, setDrafts] = useState<DraftTier[]>([{ id: "initial", template: templates[0]! }]);
  return (
    <div className="space-y-6">
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
          remove={() => setDrafts((current) => current.filter((entry) => entry.id !== draft.id))}
        />
      ))}
      <Alert>
        Entry fees are configuration only. Per-place prizes, bracket editing/deletion and
        configurable positional quotas have no backend contract. Team size is defined on the event;
        supported role matching follows platform sport rules.
      </Alert>
    </div>
  );
}
