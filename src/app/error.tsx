"use client";
import { RecoveryView } from "@/components/shared/recovery-view";
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RecoveryView retry={retry} {...(error.digest ? { digest: error.digest } : {})} />;
}
