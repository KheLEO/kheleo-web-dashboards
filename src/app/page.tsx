import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  ScanLine,
  Trophy,
  Radar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";
import { readSession } from "@/server/auth/session";
import { homeForRole } from "@/server/auth/permissions";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/providers/ThemeProvider";

export default async function Home() {
  const session = await readSession();
  if (session) redirect(homeForRole(session.user.role));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-10">
        <BrandLogo href="/" size="md" />
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Button asChild variant="secondary">
            <Link href="/login" className="flex items-center gap-1.5">
              Sign in <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-5 sm:px-10">
        <section className="grid gap-10 border-y border-border/80 py-16 md:grid-cols-[1.5fr_1fr] md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              The Sovereign Sports Intelligence Infrastructure
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.07] tracking-[-.055em] sm:text-7xl">
              Potential is
              <br />
              everywhere.
              <br />
              <span className="text-metallic-gold">
                Opportunity
                <br />
                must be too.
              </span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-kheleo-silver-muted">
              Permanent sports passport. Edge AI vision drills. Resilient matchmaking and zero-reset
              identity. Built to give every grassroots athlete an uncorrupted path to glory.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/signup" className="flex items-center gap-2">
                  Build Sports Passport <ArrowRight size={16} />
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/login">Open Workspace</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="relative rounded-2xl border border-primary/30 bg-kheleo-surface/80 p-7 backdrop-blur-xl sm:p-9 shadow-2xl">
              <div className="flex items-center justify-between">
                <ShieldCheck className="text-primary" size={36} />
                <span className="text-[10px] uppercase font-bold tracking-[.2em] text-primary">
                  The KheLEO Core
                </span>
              </div>
              <p className="mt-8 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Talent deserves
                <br />
                <span className="text-primary">an uncorrupted</span> playing field.
              </p>
              <div className="my-6 h-px bg-border/80" />
              {[
                "Permanent Govt ID Verification (Anti-Reset)",
                "Grassroots Talent Index (GTI) Ratings",
                "Anti-Sandbagging Tournament Brackets",
                "Browser Edge AI Movement Tracking",
              ].map((text, index) => (
                <div className="flex items-center gap-3 py-2 text-xs sm:text-sm" key={text}>
                  <span className="font-mono text-primary font-bold">0{index + 1}</span>
                  <span className="text-kheleo-silver-chrome">{text}</span>
                </div>
              ))}
              <div className="mt-8 flex items-center justify-between pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
                <span>Athletes · Organizers · Scouts</span>
                <span className="font-mono text-primary font-bold">KheLEO v0.1</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              title: "Permanent Passport",
              text: "Cryptographically bound Government ID ensures competition history cannot be wiped or fabricated.",
            },
            {
              icon: Trophy,
              title: "Anti-Sandbagging",
              text: "Automated bracket tier enforcement rejects over-skilled competitors targeting amateur prize pools.",
            },
            {
              icon: ScanLine,
              title: "Edge AI Drills",
              text: "Private, browser-based landmark pose detection evaluates stamina, form, and raw agility.",
            },
            {
              icon: Radar,
              title: "Grassroots Radar",
              text: "Unlocks scouting access across rural, semi-urban, and Tier-3 talent pipelines in real time.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-xl border border-border/70 bg-kheleo-surface/40 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-kheleo-surface/70"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Icon size={20} />
              </div>
              <h2 className="mb-2 text-sm font-bold text-foreground">{title}</h2>
              <p className="text-xs leading-5 text-kheleo-silver-muted">{text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
