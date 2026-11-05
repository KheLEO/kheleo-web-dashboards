"use client";
import Link from "next/link";
import { Trophy, Users, Coins, Network, ShieldAlert } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { useOrganizerSummary } from "@/features/organizer/queries";
import { OwnedTournaments } from "@/features/organizer/owned-tournaments";
import { formatMoney } from "@/lib/format";
export function OrganizerOverview() {
  const query = useOrganizerSummary();
  const metrics = query.data
    ? [
        {
          label: "Active tournaments hosted",
          icon: Trophy,
          value: String(query.data.activeTournamentsCount),
          detail: "Registration open or in progress",
        },
        {
          label: "Registered athletes",
          icon: Users,
          value: String(query.data.totalRegisteredAthletes),
          detail: "Distinct athletes in confirmed registrations",
        },
        {
          label: "Configured prize pool (INR)",
          icon: Coins,
          value: formatMoney(query.data.totalPrizePoolInr),
          detail: "Configured event prizes; payment is separate",
        },
        {
          label: "Free-agent teams formed",
          icon: Network,
          value: String(query.data.freeAgentTeamsFormed),
          detail: "Persisted teams formed by matchmaking",
        },
        {
          label: "Active IoT safety alerts",
          icon: ShieldAlert,
          value: String(query.data.activeSafetyAlertsCount),
          detail: "Unacknowledged warning and critical alerts",
        },
      ]
    : [];
  return (
    <div className="space-y-6">
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      )}
      <Button asChild>
        <Link href="/organizer/tournaments/create">Create tournament</Link>
      </Button>
      <OwnedTournaments />
    </div>
  );
}
