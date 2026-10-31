"use client";
import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShieldAlert, ShieldCheck, X } from "lucide-react";
import { usePassport } from "@/features/passport/queries";
import { registerBracket } from "@/features/tournaments/api";
import { registerBracketSchema, type BracketRegistration } from "@/contracts/tournaments";
import { ApiError, asApiError } from "@/lib/api/errors";
import { sameOperation, type MutationOperation } from "@/lib/api/operation";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/async-state";
export interface BracketSummary {
  id: string;
  name: string;
  tierName: string;
  minGti: number;
  maxGti: number;
  entryFee: string | number;
  maxTeams: number;
  bracketType: string;
}
export interface BracketRegistrationModalProps {
  tournamentId: string;
  tournamentName: string;
  sport: string;
  currency?: string;
  prizePool?: string | number;
  brackets: BracketSummary[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedBracketId?: string;
}
interface FairPlayConflict {
  athleteGti: number;
  ceiling: number;
  suggestedId: string | null;
  suggestedTier: string | null;
  authoritative: boolean;
}
export function BracketRegistrationModal({
  tournamentId,
  tournamentName,
  sport,
  currency = "INR",
  prizePool,
  brackets,
  isOpen,
  onClose,
  onSuccess,
  selectedBracketId,
}: BracketRegistrationModalProps) {
  const passport = usePassport();
  const [teamId, setTeamId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conflict, setConflict] = useState<FairPlayConflict | null>(null);
  const [registration, setRegistration] = useState<BracketRegistration | null>(null);
  const operations = useRef(new Map<string, MutationOperation>());
  const inFlight = useRef(false);
  async function register(id: string): Promise<void> {
    if (inFlight.current) return;
    const payload = registerBracketSchema.safeParse(teamId.trim() ? { teamId: teamId.trim() } : {});
    if (!payload.success) {
      setError(new Error("Enter a valid team UUID or leave it empty."));
      return;
    }
    const bracket = brackets.find((entry) => entry.id === id);
    const gti = passport.data?.currentGti;
    if (bracket && gti !== undefined && gti > bracket.maxGti)
      setConflict({
        athleteGti: gti,
        ceiling: bracket.maxGti,
        suggestedId: null,
        suggestedTier: null,
        authoritative: false,
      });
    inFlight.current = true;
    setPending(true);
    setError(null);
    const key = `${id}:${teamId}`;
    const operation = sameOperation(operations.current.get(key) ?? null, payload.data);
    operations.current.set(key, operation);
    try {
      const result = await registerBracket(tournamentId, id, operation);
      setRegistration(result);
      setConflict(null);
      operations.current.delete(key);
      onSuccess?.();
    } catch (failure: unknown) {
      const issue = asApiError(failure);
      if (
        issue instanceof ApiError &&
        issue.problem.status === 409 &&
        issue.problem.code === "SANDBAGGING_DETECTED"
      ) {
        const score = issue.problem.athleteGti ?? gti;
        const ceiling = issue.problem.bracketMaxGti ?? bracket?.maxGti;
        if (score !== undefined && ceiling !== undefined)
          setConflict({
            athleteGti: score,
            ceiling,
            suggestedId: issue.problem.suggestedBracketId ?? null,
            suggestedTier: issue.problem.suggestedBracketTier ?? null,
            authoritative: true,
          });
        else {
          setConflict(null);
          setError(issue);
        }
      } else {
        setConflict(null);
        setError(issue);
      }
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }
  const ordered = selectedBracketId
    ? [...brackets].sort(
        (a, b) => Number(b.id === selectedBracketId) - Number(a.id === selectedBracketId),
      )
    : brackets;
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/90 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-primary/40 bg-card p-6">
          <Dialog.Title className="pr-8 text-xl font-semibold">
            {tournamentName} · Bracket registration
          </Dialog.Title>
          <Dialog.Description className="mb-5 mt-2 text-sm text-muted-foreground">
            {sport} · The platform confirms GTI eligibility and capacity. Entry fees are
            configuration; no payment is collected here.
            {prizePool !== undefined
              ? ` Tournament prize pool: ${formatMoney(prizePool, currency)}.`
              : ""}
          </Dialog.Description>
          <Dialog.Close
            disabled={pending}
            aria-label="Close registration"
            className="absolute right-4 top-4 rounded p-1"
          >
            <X size={20} />
          </Dialog.Close>
          {registration ? (
            <Alert>
              <ShieldCheck className="mb-3 text-success" />
              <h3 className="font-semibold">Registration {registration.status.toLowerCase()}</h3>
              <p className="mt-2 break-all text-xs">Reference: {registration.registrationId}</p>
            </Alert>
          ) : conflict ? (
            <section
              className="rounded-xl border border-destructive/50 bg-destructive/10 p-5"
              aria-label="Anti-sandbagging fair-play shield"
            >
              <ShieldAlert className="mb-3 text-primary" size={30} />
              <h3 className="text-lg font-semibold">Anti-Sandbagging Fair-Play Shield</h3>
              <p className="my-4 text-sm leading-6">
                Your platform GTI of <strong>{conflict.athleteGti.toFixed(1)}</strong> exceeds this
                bracket ceiling of <strong>{conflict.ceiling.toFixed(1)}</strong>. Competing at an
                appropriate tier protects fair play.
              </p>
              {!conflict.authoritative ? (
                <p role="status" className="text-sm">
                  Checking eligibility with the platform…
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {conflict.suggestedId
                      ? `Recommended bracket: ${conflict.suggestedTier ?? conflict.suggestedId}`
                      : "The platform did not provide a recommended bracket."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {conflict.suggestedId && (
                      <Button
                        className="whitespace-normal"
                        disabled={pending}
                        onClick={() => {
                          if (conflict.suggestedId) void register(conflict.suggestedId);
                        }}
                      >
                        Upgrade & Register in Recommended Bracket
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => setConflict(null)}
                    >
                      Back to bracket list
                    </Button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <>
              <label className="field mb-5">
                Team UUID (optional)
                <input
                  className="control"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  disabled={pending}
                />
              </label>
              {passport.isPending ? (
                <p>Loading your passport…</p>
              ) : passport.error ? (
                <ErrorState error={passport.error} />
              ) : (
                <p className="mb-4 text-xs text-muted-foreground">
                  Your current platform GTI: {passport.data.currentGti.toFixed(1)} ·{" "}
                  {passport.data.identityStatus}
                </p>
              )}
              <div className="space-y-4">
                {ordered.map((entry) => (
                  <section className="rounded-xl border bg-background p-4" key={entry.id}>
                    <Badge>{entry.tierName}</Badge>
                    <h3 className="mt-3 font-semibold">{entry.name}</h3>
                    <dl className="my-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <dt>GTI range</dt>
                        <dd className="mt-1 text-primary">
                          {entry.minGti}–{entry.maxGti}
                        </dd>
                      </div>
                      <div>
                        <dt>Entry fee</dt>
                        <dd className="mt-1">{formatMoney(entry.entryFee, currency)}</dd>
                      </div>
                      <div>
                        <dt>Capacity</dt>
                        <dd className="mt-1">{entry.maxTeams} teams</dd>
                      </div>
                      <div>
                        <dt>Format</dt>
                        <dd className="mt-1">{entry.bracketType.replaceAll("_", " ")}</dd>
                      </div>
                    </dl>
                    <Button
                      disabled={pending || !passport.data}
                      onClick={() => {
                        void register(entry.id);
                      }}
                    >
                      {pending ? "Registering…" : "Confirm registration"}
                    </Button>
                  </section>
                ))}
              </div>
            </>
          )}
          {error && (
            <div className="mt-5">
              <ErrorState error={error} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
