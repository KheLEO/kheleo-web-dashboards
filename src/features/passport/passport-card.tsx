"use client";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight, IdCard } from "lucide-react";
import type { AthletePassport } from "@/contracts/passport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
export function PassportCard({
  profile,
  editable = false,
}: {
  profile: AthletePassport;
  editable?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-primary/30 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-6 py-4">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <IdCard size={17} />
          Digital sports passport
        </span>
        {profile.identityStatus === "VERIFIED" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={12} className="text-emerald-400" />
            Aadhaar Verified — Permanent Sports Identity Bound
          </span>
        ) : (
          <Badge>
            <ShieldCheck size={12} />
            {profile.identityStatus.replaceAll("_", " ")}
          </Badge>
        )}
      </div>
      <div className="grid gap-8 p-6 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Primary discipline
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {profile.primarySport?.replaceAll("_", " ") ?? "Choose your primary sport"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.district}, {profile.state}
          </p>
          <p className="mt-4 font-mono text-[10px] text-muted-foreground">ID {profile.userId}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.secondarySports.map((sport) => (
              <Badge key={sport} className="border-border bg-secondary text-foreground">
                {sport}
              </Badge>
            ))}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Grassroots talent index
          </p>
          <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight text-primary">
            {formatNumber(profile.currentGti)}
            <span className="ml-1 text-lg text-muted-foreground">/100</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Platform-calculated GTI</p>
        </div>
      </div>
      <div className="grid gap-5 border-t px-6 py-5 sm:grid-cols-3">
        {[
          { label: "Posture points", value: String(profile.posturePoints) },
          { label: "Wearable score", value: formatNumber(profile.wearableScore) },
          { label: "Match score", value: formatNumber(profile.matchPerfScore) },
        ].map((metric) => (
          <div key={metric.label}>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-xl font-medium tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>
      {editable && (
        <div className="flex flex-wrap gap-3 border-t px-6 py-4">
          <Button asChild variant="secondary">
            <Link href="/athlete/passport/edit">
              Edit passport <ArrowUpRight size={15} />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/athlete/passport/sports">Manage sport records</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
