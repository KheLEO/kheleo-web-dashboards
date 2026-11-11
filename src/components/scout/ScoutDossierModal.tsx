"use client";
import { useState, type Ref } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AthletePassportPreview } from "@/features/scouting/athlete-passport-preview";
export interface ScoutDossierModalProps {
  userId: string;
  label?: string;
  triggerRef?: Ref<HTMLButtonElement>;
}
export function ScoutDossierModal({
  userId,
  label = "Inspect athlete passport",
  triggerRef,
}: ScoutDossierModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button ref={triggerRef} variant="secondary">
          <ScanSearch size={16} />
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l bg-background p-5 shadow-xl sm:p-8">
          <Dialog.Title className="pr-10 text-xl font-semibold">Athlete scout dossier</Dialog.Title>
          <Dialog.Description className="mb-6 mt-3 pr-6 text-sm leading-6 text-muted-foreground">
            Verified Legit scores, signed drill evidence, season progression, and your private
            outreach history. Only verified Legit athletes appear in scouting dossiers.
          </Dialog.Description>
          {open && <AthletePassportPreview userId={userId} />}
          <Dialog.Close
            aria-label="Close athlete inspector"
            className="absolute right-4 top-4 rounded p-2"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
