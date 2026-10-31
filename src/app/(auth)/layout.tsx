import type { ReactNode } from "react";
import { Brand } from "@/components/shell/brand";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-5 py-7">
        <Brand />
      </header>
      <main
        id="main-content"
        className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-2 md:py-20"
      >
        <section className="max-w-md">
          <p className="eyebrow">Your next chapter starts here</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Built for the athlete.
            <br />
            <span className="text-primary">Backed by identity.</span>
          </h1>
          <p className="mt-6 text-sm leading-7 text-muted-foreground">
            One account connects your sports passport, local competition, and development journey.
            Your permanent identity keeps every achievement yours.
          </p>
          <div className="mt-8 border-l-2 border-primary pl-5 text-sm leading-6 text-muted-foreground">
            Organizer, scout, and policy accounts are provisioned by the platform. Sign in with your
            existing verified credentials.
          </div>
        </section>
        <section className="panel">{children}</section>
      </main>
    </div>
  );
}
