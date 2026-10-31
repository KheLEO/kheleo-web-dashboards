"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { z } from "zod";
import { ShieldCheck, Share2, RefreshCw } from "lucide-react";
import { useSession } from "@/features/auth/session-provider";
import { usePassport, useSports } from "@/features/passport/queries";
import { ProfileForm } from "@/features/passport/profile-form";
import { savePassport, saveSport } from "@/features/passport/api";
import { recalculateGti } from "@/features/rankings/api";
import { sportRoles } from "@/features/athlete/sport-options";
import { sportInputSchema, updatePassportSchema } from "@/contracts/passport";
import { SportTypeValues, type SportType } from "@/contracts/enums.generated";
import { ApiError, asApiError } from "@/lib/api/errors";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { SchemaForm } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";

const editorSchema = z.object({
  primaryRole: z.string().min(1),
  secondaryRole: z.string().optional(),
});
export function SportsPassportCard() {
  const { user } = useSession();
  const query = usePassport();
  const records = useSports();
  const client = useQueryClient();
  const [selected, setSelected] = useState<SportType | null>(null);
  const [url, setUrl] = useState("");
  const [shareError, setShareError] = useState<Error | null>(null);
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const analysis = useMutation({
    onSettled: () => {
      flight.current = false;
    },
    mutationFn: (action: MutationOperation) => recalculateGti(user.id, action),
    onSuccess: () => {
      operation.current = null;
      void client.invalidateQueries({ queryKey: ["passport", user.id] });
    },
  });
  if (query.isPending) return <Skeleton />;
  if (query.error)
    return query.error instanceof ApiError && query.error.problem.status === 404 ? (
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Create your sports passport</h2>
        <ProfileForm />
      </Card>
    ) : (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const profile = query.data;
  const sport = selected ?? profile.primarySport;
  const record = records.data?.pages
    .flatMap((page) => page.data)
    .find((entry) => entry.sport === sport);
  const components = [
    { label: "Biomechanical form", weight: 35, value: analysis.data?.biomechanicalScore },
    { label: "Wearable consistency", weight: 25, value: analysis.data?.wearableScore },
    { label: "Match performance", weight: 40, value: analysis.data?.matchPerformanceScore },
  ];
  const gti = analysis.data?.gti ?? profile.currentGti;
  return (
    <div className="space-y-6">
      <section
        aria-label="Digital sports passport"
        className="overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-gold-glow"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">
            Digital sports passport
          </h2>
          <Badge>
            <ShieldCheck size={14} />
            {profile.identityStatus.replaceAll("_", " ")}
          </Badge>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Athlete identity
            </p>
            <h3 className="mt-2 break-words text-2xl font-semibold">
              {user.email ?? user.phone ?? `Athlete ${user.id.slice(0, 8)}`}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {profile.district}, {profile.state}
            </p>
            <p className="mt-3 text-sm">
              {profile.primarySport} · {profile.tierClassification}
            </p>
            <p className="mt-4 break-all font-mono text-xs text-muted-foreground">
              {profile.userId}
            </p>
            <p className="mt-3 max-w-md text-xs leading-5 text-muted-foreground">
              Verification reflects the permanent platform identity binding. Raw government IDs and
              identity hashes are not exposed here.
            </p>
          </div>
          <div
            role="meter"
            aria-label="Composite GTI"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={gti}
            className="flex flex-col items-center"
          >
            <svg viewBox="0 0 140 140" className="h-40 w-40" aria-hidden="true">
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="rgb(var(--border))"
                strokeWidth="8"
              />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="rgb(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${(Math.min(100, Math.max(0, gti)) / 100) * 364.42} 364.42`}
                transform="rotate(-90 70 70)"
              />
              <text
                x="70"
                y="73"
                textAnchor="middle"
                fill="rgb(var(--foreground))"
                fontSize="30"
                fontWeight="700"
              >
                {gti.toFixed(1)}
              </text>
              <text
                x="70"
                y="94"
                textAnchor="middle"
                fill="rgb(var(--muted-foreground))"
                fontSize="11"
              >
                GTI / 100
              </text>
            </svg>
          </div>
        </div>
        <div className="border-t p-6">
          <p className="mb-4 text-xs text-muted-foreground">
            GTI = 0.35 × Biomechanical + 0.25 × Wearable + 0.40 × Match
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {components.map((entry) => (
              <div key={entry.label} className="rounded-lg border bg-background p-4">
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span>{entry.label}</span>
                  <strong className="text-primary">{entry.weight}%</strong>
                </div>
                <p className="mt-3 text-xl tabular-nums">
                  {entry.value === undefined ? "Unavailable" : entry.value.toFixed(1)}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${entry.value ?? 0}%` }} />
                </div>
                {entry.value !== undefined && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Contribution {((entry.value * entry.weight) / 100).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="my-4 text-xs leading-5 text-muted-foreground">
            The passport response omits the computed component breakdown. Recalculation retrieves
            authoritative components and updates GTI; it is never triggered automatically.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={analysis.isPending}
              onClick={() => {
                if (flight.current) return;
                flight.current = true;
                operation.current ??= createOperation({});
                analysis.mutate(operation.current);
              }}
            >
              <RefreshCw size={15} />
              Recalculate GTI & show breakdown
            </Button>
            <Dialog
              trigger={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShareError(null);
                    setUrl(`${window.location.origin}/scout/athletes/${user.id}`);
                  }}
                >
                  <Share2 size={15} />
                  Share passport link
                </Button>
              }
              title="Share athlete passport"
              description="This QR links to an authorized scout passport view. Recipients must sign in with an allowed role; this is not public government-ID verification."
            >
              {url && (
                <>
                  <div className="flex justify-center rounded-lg border bg-background p-5">
                    <QRCodeSVG
                      role="img"
                      aria-label="Authorized athlete passport QR"
                      value={url}
                      size={180}
                      marginSize={4}
                      bgColor="rgb(var(--background))"
                      fgColor="rgb(var(--foreground))"
                    />
                  </div>
                  <p className="my-4 break-all text-xs">{url}</p>
                  <Button
                    onClick={async () => {
                      try {
                        if (!navigator.clipboard)
                          throw new Error(
                            "Clipboard access is unavailable. Copy the link above manually.",
                          );
                        await navigator.clipboard.writeText(url);
                      } catch (error: unknown) {
                        setShareError(asApiError(error));
                      }
                    }}
                  >
                    Copy authorized link
                  </Button>
                  {shareError && (
                    <div className="mt-3">
                      <ErrorState error={shareError} />
                    </div>
                  )}
                </>
              )}
            </Dialog>
          </div>
          {analysis.error && (
            <div className="mt-4">
              <ErrorState error={analysis.error} />
            </div>
          )}
        </div>
      </section>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Multi-sport roles</h2>
        <label className="field mb-5 max-w-sm">
          Select sport
          <select
            className="control"
            aria-label="Select sport"
            value={sport}
            onChange={(event) => setSelected(z.enum(SportTypeValues).parse(event.target.value))}
          >
            {SportTypeValues.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
        {records.isPending ? (
          <Skeleton />
        ) : records.error ? (
          <ErrorState error={records.error} />
        ) : (
          <>
            <SchemaForm
              key={`${sport}:${record?.id ?? "new"}:${record?.updatedAt ?? ""}`}
              fields={[
                {
                  name: "primaryRole",
                  label: "Primary role",
                  type: "select",
                  options: sportRoles[sport],
                  required: true,
                },
                {
                  name: "secondaryRole",
                  label: "Secondary role",
                  type: "select",
                  options: sportRoles[sport],
                },
              ]}
              schema={editorSchema}
              defaults={{
                primaryRole: record?.primaryRole ?? "",
                secondaryRole: record?.secondaryRoles[0] ?? "",
              }}
              submitLabel="Save sport roles"
              submit={async (value, action) => {
                const payload = sportInputSchema.parse({
                  sport,
                  primaryRole: value.primaryRole,
                  secondaryRoles: value.secondaryRole ? [value.secondaryRole] : [],
                });
                return saveSport(user.id, { id: action.id, body: JSON.stringify(payload) });
              }}
              onSuccess={() => {
                void client.invalidateQueries({ queryKey: ["sports", user.id] });
                void client.invalidateQueries({ queryKey: ["passport", user.id] });
              }}
            />
            <LoadMore
              hasNext={records.hasNextPage}
              loading={records.isFetchingNextPage}
              load={() => {
                void records.fetchNextPage();
              }}
            />
            <p className="mt-4 text-xs text-muted-foreground">
              Roles are self-reported. Sport-specific stance needs a separate metadata contract;
              verified performance metrics are preserved by the platform.
            </p>
          </>
        )}
      </Card>
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Primary sport and handedness</h2>
        <SchemaForm
          fields={[
            {
              name: "primarySport",
              label: "Primary sport",
              type: "select",
              options: SportTypeValues,
            },
            {
              name: "dominantSide",
              label: "Dominant side (all sports)",
              type: "select",
              options: ["RIGHT", "LEFT", "BOTH"],
            },
          ]}
          schema={updatePassportSchema}
          defaults={{
            primarySport: profile.primarySport,
            dominantSide: profile.physicalStats.dominantSide ?? "",
          }}
          submitLabel="Update primary sport and handedness"
          submit={(_value, action) => savePassport(user.id, action, false)}
          onSuccess={() => {
            void client.invalidateQueries({ queryKey: ["passport", user.id] });
          }}
        />
      </Card>
      <Alert>
        Names and public dossier sharing need additional backend contracts. This card displays your
        actual account contact and an access-controlled passport link.
      </Alert>
    </div>
  );
}
