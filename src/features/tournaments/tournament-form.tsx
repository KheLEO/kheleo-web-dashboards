"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createTournamentSchema, type CreateTournamentRequest } from "@/contracts/tournaments";
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
import { createTournament } from "./api";
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
export function TournamentForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const flight = useRef(false);
  const operation = useRef<MutationOperation | null>(null);
  const { register, control, getValues, setValue } = useForm<CreateTournamentRequest>({
    defaultValues: {
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
      const result = await createTournament(operation.current);
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
          {step === 0 && (
            <Alert>
              Only the six platform sports are supported. Custom sports and editable rules/format
              descriptions require a backend contract.
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
              <p className="text-xs leading-5 text-muted-foreground">
                Prize pool is event-level configuration in INR. Per-place prize allocation, custom
                role quotas, and payments are not supported. Brackets are created after the event.
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
                Creation saves the event first. You can then add bracket tiers independently.
                Existing events and saved brackets cannot yet be edited or deleted.
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
            {pending ? "Creating…" : step === 3 ? "Create tournament" : "Continue"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
