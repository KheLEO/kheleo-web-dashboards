"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Sparkles, X, ExternalLink } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/features/auth/session-provider";

export interface IdentityFormProps {
  idType?: string;
  isVerified?: boolean;
  onSuccess?: () => void;
}

export function IdentityForm({ isVerified: propVerified, onSuccess }: IdentityFormProps = {}) {
  const { user } = useSession();
  const isVerified =
    propVerified !== undefined ? propVerified : Boolean(user?.isVerified || user?.isLegit);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Card id="verify-account" className="border-border/80 bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${isVerified ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
          >
            {isVerified ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
          </div>
          <div>
            <h2 className="text-base font-semibold">Identity Verification via DigiLocker</h2>
            <p className="text-xs text-muted-foreground">
              LinkedIn-style instant identity verification powered by DigiLocker.
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-sm">
            <ShieldCheck size={14} className="text-emerald-400" />
            Status: Legit (Verified)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-400 shadow-sm">
            <ShieldAlert size={14} className="text-rose-400" />
            Status: Not Legit (Unverified)
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Verify your identity with DigiLocker (just like LinkedIn) to switch your account from Not
        Legit to Legit. While Not Legit accounts can participate in organized tournaments and
        events, only Legit accounts are visible to verified scouts and academies.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isVerified ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs font-medium text-emerald-400">
            <ShieldCheck size={15} />
            <span>
              Identity confirmed. Your Sports Passport is visible to scouts and academies.
            </span>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setModalOpen(true);
              onSuccess?.();
            }}
            className="gap-2 text-xs font-semibold shadow-gold-glow"
          >
            <ShieldCheck size={15} />
            <span>Verify My Account</span>
          </Button>
        )}
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-primary/40 bg-card p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <Sparkles size={12} className="animate-pulse" />
                <span>DigiLocker Integration</span>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="mt-4 space-y-4">
              <Dialog.Title className="text-xl font-bold tracking-tight text-foreground">
                DigiLocker Integration Coming Up
              </Dialog.Title>

              <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                Official Government of India DigiLocker OAuth verification is coming up in the next
                release. In the meantime, you have full access to create your Sports Passport and
                compete in organized campus and regional tournaments!
              </Dialog.Description>

              <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ExternalLink size={14} className="text-primary" />
                  <span>Participate in Competitions Without Interruption</span>
                </div>
                <p>
                  Your current <strong className="text-rose-400">Not Legit</strong> status does not
                  prevent you from entering tournaments, finding free-agent teams, or recording
                  match scores. Once DigiLocker launches, single-click verification will unlock the{" "}
                  <strong className="text-emerald-400">Legit</strong> badge and scout discovery.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="button" onClick={() => setModalOpen(false)}>
                  Got it
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
