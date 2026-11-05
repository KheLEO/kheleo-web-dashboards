"use client";
import * as Primitive from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { Button } from "./button";
export function CriticalDialog({
  open,
  onSeen,
  title,
  children,
  fullScreen = false,
  action,
}: {
  open: boolean;
  onSeen: () => void;
  title: string;
  children: ReactNode;
  fullScreen?: boolean;
  action?: ReactNode;
}) {
  return (
    <Primitive.Root open={open}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-background/90" />
        <Primitive.Content
          className={
            fullScreen
              ? "fixed inset-0 z-50 h-[100dvh] w-screen max-w-none overflow-y-auto border-2 border-destructive bg-card p-6 sm:p-10"
              : "fixed left-1/2 top-1/2 z-50 max-h-[85dvh] overflow-y-auto w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-destructive bg-card p-6"
          }
        >
          <Primitive.Title className="text-2xl font-semibold">{title}</Primitive.Title>
          <Primitive.Description asChild>
            <div className="my-4 text-sm">{children}</div>
          </Primitive.Description>
          {action ?? (
            <Primitive.Action asChild>
              <Button onClick={onSeen}>Mark seen in this browser</Button>
            </Primitive.Action>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
