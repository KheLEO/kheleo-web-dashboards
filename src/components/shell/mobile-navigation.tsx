"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import type { Workspace } from "@/server/auth/permissions";
export function MobileNavigation({ workspace }: { workspace: Workspace }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Open navigation" className="rounded border p-2 lg:hidden">
        <Menu size={20} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(19rem,90vw)] overflow-y-auto overscroll-contain bg-card pb-[env(safe-area-inset-bottom)]">
          <Dialog.Title className="sr-only">Workspace navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Choose a page in your workspace.
          </Dialog.Description>
          <Sidebar workspace={workspace} mobile onNavigate={() => setOpen(false)} />
          <Dialog.Close aria-label="Close navigation" className="absolute right-3 top-3 p-2">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
