"use client";
import { Users, Trophy, ShieldCheck, ScanLine, HeartPulse, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/shared/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/async-state";
import { useAdminDashboard } from "./queries";
import { SystemHealth } from "./system-health";
export function AdminWorkspace() {
  const query = useAdminDashboard();
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
          {[
            {
              label: "Verified athletes",
              value: query.data.totalVerifiedAthletes,
              icon: ShieldCheck,
            },
            { label: "Active tournaments", value: query.data.activeTournaments, icon: Trophy },
            {
              label: "Organizers and scouts",
              value: query.data.totalOrganizersAndScouts,
              icon: Users,
            },
            {
              label: "Verified Edge-AI drills",
              value: query.data.totalVerifiedDrills,
              icon: ScanLine,
            },
            {
              label: "IoT safety pauses",
              value: query.data.totalSafetyMatchPauses,
              icon: HeartPulse,
            },
            {
              label: "Sandbagging blocks",
              value: query.data.totalSandbaggingBlocks,
              icon: ShieldAlert,
            },
          ].map((metric) => (
            <MetricCard
              key={metric.label}
              {...metric}
              value={metric.value.toLocaleString("en-IN")}
              detail="Authorized platform totals"
            />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-primary">
        <Link href="/admin/users">User governance</Link>
        <Link href="/admin/organizers">Verification queue</Link>
        <Link href="/admin/tournaments">Tournament moderation</Link>
        <Link href="/admin/audit-logs">Security audit console</Link>
        <Link href="/admin/theme">Theme studio</Link>
      </div>
      <SystemHealth />
    </div>
  );
}
