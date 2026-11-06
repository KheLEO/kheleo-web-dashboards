"use client";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  beginContactProof,
  contactProofConfigured,
  type ContactChallenge,
  type ContactInput,
} from "./contact-proof.client";
import { Button } from "@/components/ui/button";
interface PendingProof {
  challenge: ContactChallenge;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}
export function useContactProof() {
  const pending = useRef<PendingProof | null>(null);
  const alive = useRef(true);
  const [challenge, setChallenge] = useState<ContactChallenge | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.reject(new Error("Contact verification cancelled"));
      pending.current = null;
    };
  }, []);
  function cancel(): void {
    pending.current?.reject(new Error("Contact verification cancelled"));
    pending.current = null;
    setChallenge(null);
  }
  async function verify(input: ContactInput, createUser: boolean): Promise<string | undefined> {
    if (!contactProofConfigured()) return undefined;
    const next = await beginContactProof(input, createUser);
    if (!alive.current) throw new Error("Contact verification cancelled");
    setCode("");
    setError(null);
    setChallenge(next);
    return new Promise<string>((resolve, reject) => {
      pending.current = { challenge: next, resolve, reject };
    });
  }
  const dialog = (
    <Dialog.Root
      open={challenge !== null}
      onOpenChange={(open) => {
        if (!open) cancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold">Verify your contact</Dialog.Title>
          <Dialog.Description className="my-4 text-sm">
            Enter the one-time code sent to {challenge?.contact}. Government identity proof stays
            with KheLEO.
          </Dialog.Description>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (flight.current || !pending.current) return;
              const current = pending.current;
              flight.current = true;
              setBusy(true);
              setError(null);
              void current.challenge
                .verify(code.trim())
                .then((token) => {
                  if (pending.current !== current || !alive.current) return;
                  pending.current = null;
                  setChallenge(null);
                  current.resolve(token);
                })
                .catch((failure: unknown) => {
                  if (pending.current === current && alive.current)
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : "Contact verification failed. Request a new code.",
                    );
                })
                .finally(() => {
                  flight.current = false;
                  if (alive.current) setBusy(false);
                });
            }}
          >
            <label className="field">
              Verification code
              <input
                className="control"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6,8}"
                minLength={6}
                maxLength={8}
                required
                autoFocus
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={busy}>
                Verify and continue
              </Button>
              <Button type="button" variant="secondary" onClick={cancel}>
                Cancel verification
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  return { verify, dialog };
}
