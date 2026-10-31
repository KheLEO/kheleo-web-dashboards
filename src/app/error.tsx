"use client";
import { RecoveryView } from "@/components/shared/recovery-view";
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest =
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : undefined;
  return <RecoveryView retry={retry} {...(digest ? { digest } : {})} />;
}
