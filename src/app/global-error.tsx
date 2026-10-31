"use client";
import "./globals.css";
import { RecoveryView } from "@/components/shared/recovery-view";
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" data-theme="kheleo-gold-crimson">
      <body className="bg-background text-foreground">
        <RecoveryView global retry={retry} {...(error.digest ? { digest: error.digest } : {})} />
      </body>
    </html>
  );
}
