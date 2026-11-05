"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createTournamentSchema,
  type CreateTournamentRequest,
  type TournamentDetail,
} from "@/contracts/tournaments";
import { sameOperation, type MutationOperation } from "@/lib/api/operation";
import { asApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { GtiRange } from "@/features/organizer/gti-range";
import {
  eventSteps,
  serializeEventDraft,
  validateEventStep,
} from "@/features/organizer/event-draft";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { CompetitionRulesEditor } from "@/features/organizer/competition-rules-editor";
import { competitionConfigSchema } from "@/contracts/organizer";
import { TournamentStatusValues } from "@/contracts/enums.generated";
import { createTournament, updateTournament, deleteTournament } from "./api";
import { tournamentFields } from "./schemas";
const VenuePicker = dynamic(() => import("@/features/organizer/venue-picker.client"), {
  ssr: false,
  loading: () => <p role="status">Loading venue map…</p>,
});
const stepFields = [
  ["name", "sport", "registrationDeadline", "startDate", "endDate"],
  ["venueName", "venueLat", "venueLng"],
  ["maxTeams", "teamSize", "prizePool"],
];
interface TournamentFormProps {
  tournament?: TournamentDetail;
}
const localDate = (value: string): string => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function TournamentForm({ tournament }: TournamentFormProps) {
  const client = useQueryClient();
  const { user } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const flight = useRef(false);
  const operation = useRef<MutationOperation | null>(null);
  const { register, control, getValues, setValue } = useForm<CreateTournamentRequest>({
    defaultValues: tournament
      ? {
          name: tournament.name || tournament.title,
          sport: tournament.sport,
          status: tournament.status,
          minGti: Number(tournament.minGti),
          maxGti: Number(tournament.maxGti),
          maxTeams: tournament.maxTeams,
          teamSize: tournament.teamSize,
          prizePool: Number(tournament.prizePool),
          venueName: tournament.venueName,
          venueLat: tournament.venueLat,
          venueLng: tournament.venueLng,
          registrationDeadline: localDate(tournament.registrationDeadline),
          startDate: localDate(tournament.startDate),
          endDate: localDate(tournament.endDate),
          rulesConfig: competitionConfigSchema.parse(tournament.rulesConfig),
        }
      : {
          name: "",
          sport: "CRICKET",
          minGti: 0,
          maxGti: 100,
          maxTeams: 16,
          teamSize: 11,
          prizePool: 0,
          venueName: "",
          venueLat: 28.6692,
          venueLng: 77.4538,
          registrationDeadline: "",
          startDate: "",
          endDate: "",
        },
  });
  const values = useWatch({ control });
  async function advance(): Promise<void> {
    if (flight.current) return;
    const draft = getValues();
    const issue = validateEventStep(draft, step);
    setError(issue);
    if (issue) return;
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    flight.current = true;
    setPending(true);
    try {
      const payload = createTournamentSchema.parse(serializeEventDraft(draft));
      operation.current = sameOperation(operation.current, payload);
      const result = tournament
        ? await updateTournament(tournament.id, operation.current)
        : await createTournament(operation.current);
      void client.invalidateQueries({ queryKey: ["owned-tournaments", user.id] });
      void client.invalidateQueries({ queryKey: ["organizer-summary", user.id] });
      void client.invalidateQueries({ queryKey: ["tournament", user.id, result.id] });
      router.push(`/organizer/tournaments/${result.id}`);
    } catch (failure: unknown) {
      setError(asApiError(failure).message);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  return (
    <Card>
      <ol
        aria-label="Tournament creation steps"
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {eventSteps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`rounded-lg border p-3 text-xs ${step === index ? "border-primary text-primary" : "text-muted-foreground"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <h2 className="mb-5 text-xl font-semibold">{eventSteps[step]}</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void advance();
        }}
        className="space-y-6"
      >
        <fieldset disabled={pending} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {tournamentFields
              .filter((field) => stepFields[step]?.includes(field.name))
              .map((field) => {
                const name = field.name as keyof CreateTournamentRequest;
                return (
                  <label className="field" key={name}>
                    {field.label}
                    {field.type === "select" ? (
                      <select className="control" aria-label={field.label} {...register(name)}>
                        {field.options?.map((option) => (
                          <option key={option}>{option}</option>
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
          {step === 0 && tournament && (
            <label className="field">
              Tournament status
              <select aria-label="Tournament status" className="control" {...register("status")}>
                {TournamentStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          {step === 0 && (
            <Alert>
              Choose one of the six platform sports. Role quotas and prize allocation are configured
              in the capacity step.
            </Alert>
          )}
          {step === 1 && (
            <VenuePicker
              latitude={values.venueLat ?? 28.6692}
              longitude={values.venueLng ?? 77.4538}
              onChange={(lat, lng) => {
                setValue("venueLat", lat, { shouldDirty: true });
                setValue("venueLng", lng, { shouldDirty: true });
              }}
            />
          )}
          {step === 2 && (
            <>
              <GtiRange
                floor={values.minGti ?? 0}
                ceiling={values.maxGti ?? 100}
                onFloor={(value) => setValue("minGti", value)}
                onCeiling={(value) => setValue("maxGti", value)}
              />
              <CompetitionRulesEditor
                value={values.rulesConfig as CreateTournamentRequest["rulesConfig"]}
                onChange={(config) => setValue("rulesConfig", config, { shouldDirty: true })}
                sport={values.sport ?? "CRICKET"}
                teamSize={values.teamSize ?? 1}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Prize allocation configures awards in INR. Payment handling is separate.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <dl className="grid gap-4 sm:grid-cols-2">
                {tournamentFields.map((field) => (
                  <div key={field.name}>
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="mt-1 break-words text-sm">
                      {String(
                        getValues(field.name as keyof CreateTournamentRequest) ?? "Not supplied",
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <Alert>
                {tournament
                  ? "Review your changes before saving."
                  : "Creation saves the event first. You can then add and edit bracket tiers."}
              </Alert>
            </>
          )}
        </fieldset>
        {error && <Alert danger>{error}</Alert>}
        <div className="flex flex-wrap gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setStep(step - 1);
                setError(null);
              }}
            >
              Back
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : step === 3
                ? tournament
                  ? "Save tournament changes"
                  : "Create tournament"
                : "Continue"}
          </Button>
          {tournament && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={async () => {
                if (
                  flight.current ||
                  !window.confirm(
                    `Delete ${tournament.name}? This removes its brackets and registrations.`,
                  )
                )
                  return;
                flight.current = true;
                setPending(true);
                try {
                  operation.current = sameOperation(operation.current, {});
                  await deleteTournament(tournament.id, operation.current);
                  void client.invalidateQueries({ queryKey: ["owned-tournaments", user.id] });
                  void client.invalidateQueries({ queryKey: ["organizer-summary", user.id] });
                  router.push("/organizer/tournaments");
                } catch (failure: unknown) {
                  setError(asApiError(failure).message);
                } finally {
                  flight.current = false;
                  setPending(false);
                }
              }}
            >
              Delete tournament
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
