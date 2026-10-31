"use client";
import "./globals.css";
import { RecoveryView } from "@/components/shared/recovery-view";
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;
  return (
    <html lang="en" data-theme="kheleo-gold-crimson">
      <body className="bg-background text-foreground">
        <RecoveryView global retry={retry} {...(digest ? { digest } : {})} />
      </body>
    </html>
  );
}
