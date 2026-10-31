"use client";
import Link from "next/link";
import { ArrowUpRight, Trophy, ScanLine, Watch } from "lucide-react";
import { usePassport } from "./queries";
import { PassportView } from "./passport-view";
import { Card } from "@/components/ui/card";
import { IndividualRankCard } from "@/features/rankings/individual-rank-card";
export function AthleteOverview() {
  const query = usePassport();
  return (
    <div className="space-y-6">
      <PassportView />
      {query.data && (
        <div className="grid gap-5 sm:grid-cols-2">
          <IndividualRankCard sport={query.data.primarySport} />
          <IndividualRankCard sport={query.data.primarySport} district={query.data.district} />
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            href: "/athlete/tournaments",
            icon: Trophy,
            title: "Find your next arena",
            text: "Discover nearby tournaments and the right tier for your GTI.",
          },
          {
            href: "/athlete/drills",
            icon: ScanLine,
            title: "Understand your movement",
            text: "Explore private pose tracking and joint-angle feedback.",
          },
          {
            href: "/athlete/wearable",
            icon: Watch,
            title: "Connect your wearable",
            text: "Read heart rate or explore the biometric simulator.",
          },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="group min-w-0">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <div className="flex justify-between text-primary">
                <Icon size={22} />
                <ArrowUpRight size={18} />
              </div>
              <h2 className="mb-2 mt-7 font-semibold">{title}</h2>
              <p className="text-sm leading-6 text-muted-foreground">{text}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
