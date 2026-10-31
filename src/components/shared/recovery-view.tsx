"use client";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface RecoveryViewProps {
  retry: () => void;
  global?: boolean;
  digest?: string;
}
export function RecoveryView({ retry, global = false, digest }: RecoveryViewProps) {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12"
    >
      <ShieldAlert className="mb-6 text-primary" size={36} />
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        KheLEO · Recovery
      </p>
      <h1 className="mt-4 text-3xl font-semibold">
        {global ? "KheLEO could not load" : "Workspace unavailable"}
      </h1>
      <p className="my-5 leading-7 text-muted-foreground">
        A page could not be rendered. Retry to fetch fresh content, or return to the home page.
      </p>
      {digest && (
        <p className="mb-5 break-all font-mono text-xs text-muted-foreground">
          Reference: {digest}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload application
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/">Return to KheLEO</Link>
        </Button>
      </div>
    </main>
  );
}
