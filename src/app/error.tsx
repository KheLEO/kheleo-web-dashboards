"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
      <p className="my-5 text-sm text-muted-foreground">
        The application could not load this page. Check the session and service connection, then
        retry.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
