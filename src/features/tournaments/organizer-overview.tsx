import Link from "next/link";
import { Trophy, Users, Coins, Network, ShieldAlert, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { DependencyState } from "@/components/shared/dependency-state";
import { EventSelector } from "@/features/organizer/event-selector";
export function OrganizerOverview() {
  const metrics = [
    {
      label: "Active tournaments hosted",
      detail: "Organizer-owned event totals need a listing API.",
      icon: Trophy,
    },
    {
      label: "Verified athletes registered",
      detail: "Registration and verified-roster counts are unavailable.",
      icon: Users,
    },
    {
      label: "Prize pool distributed (INR)",
      detail: "Configured prize pools do not establish payouts.",
      icon: Coins,
    },
    {
      label: "Free-agent teams formed",
      detail: "Organizer matchmaking aggregates are unavailable.",
      icon: Network,
    },
    {
      label: "Active IoT safety alerts",
      detail: "No durable safety snapshot exists; this is not a zero-alert claim.",
      icon: ShieldAlert,
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} value="Unavailable" />
        ))}
      </div>
      <Card>
        <Trophy className="mb-5 text-primary" size={28} />
        <h2 className="text-2xl font-semibold">Build a fairer competition</h2>
        <p className="mb-6 mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Pin your venue, configure event capacity and prizes, then build GTI bracket tiers.
        </p>
        <Button asChild>
          <Link href="/organizer/tournaments/create">
            Create tournament <ArrowUpRight size={16} />
          </Link>
        </Button>
      </Card>
      <EventSelector />
      <DependencyState
        title="Your event directory"
        description="A paginated organizer-owned tournament listing is not yet exposed by the platform. Created events open directly by their returned ID. KPI cards remain unavailable until authoritative totals exist."
      />
    </div>
  );
}
