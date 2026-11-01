import { PageHeading } from "@/components/shared/page-heading";
import { SportsPassportCard } from "@/components/athlete/SportsPassportCard";
import { Trophy, ScanLine, Watch, Compass, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AthleteDashboardPage() {
  const quickActions = [
    {
      title: "Geospatial Tournaments",
      desc: "PostGIS discovery, skill tiers, and fair-play bracket entry.",
      href: "/athlete/tournaments",
      icon: Trophy,
      badge: "Open Competitions",
    },
    {
      title: "Edge-AI Drill Studio",
      desc: "Private on-device webcam pose tracking & biomechanical angles.",
      href: "/athlete/drills",
      icon: ScanLine,
      badge: "35% GTI Weight",
    },
    {
      title: "IoT Wearable Hub",
      desc: "Web Bluetooth GATT pairing & real-time telemetry streaming.",
      href: "/athlete/iot-device",
      icon: Watch,
      badge: "25% GTI Weight",
    },
    {
      title: "Free-Agent Pool",
      desc: "Solo player queue & real-time WebSocket team matching.",
      href: "/athlete/matchmaking",
      icon: Compass,
      badge: "Instant Teams",
    },
  ];

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <PageHeading
        eyebrow="Athlete Portal"
        title="Welcome to your Sports Passport"
        description="Your permanent grassroots athletic identity, AI movement tracking, and fair competition arena."
      />

      {/* Holographic AI Sports Passport */}
      <SportsPassportCard />

      {/* Core Athlete Feature Hub */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-4">Athlete Action Hub</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group relative flex min-w-0 max-w-full flex-col justify-between rounded-2xl border border-border/80 bg-kheleo-surface/60 p-5 backdrop-blur-sm transition-all duration-200 hover:border-primary/50 hover:bg-kheleo-surface/90 hover:shadow-lg"
              >
                <div>
                  <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {action.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-kheleo-silver-muted leading-relaxed">
                    {action.desc}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                  <span>Enter</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
