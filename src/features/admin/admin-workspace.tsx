import { Users, Trophy, ShieldCheck, ScanLine, HeartPulse, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { FrontendConnectivity } from "./frontend-connectivity";
import Link from "next/link";
import { adminRequirements } from "./capability-requirements";
import { DependencyState } from "@/components/shared/dependency-state";
export function AdminWorkspace() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Verified athletes", icon: ShieldCheck },
          { label: "Active tournaments", icon: Trophy },
          { label: "Organizers and scouts", icon: Users },
          { label: "Verified Edge-AI drills", icon: ScanLine },
          { label: "IoT safety pauses", icon: HeartPulse },
          { label: "Redis / PostGIS health and latency", icon: Activity },
        ].map((metric) => (
          <MetricCard
            key={metric.label}
            {...metric}
            value="Unavailable"
            detail="Requires an authorized platform metrics API."
          />
        ))}
      </div>
      <FrontendConnectivity />
      <div className="flex flex-wrap gap-4 text-sm text-primary">
        <Link href="/admin/users">User governance</Link>
        <Link href="/admin/audit-logs">Security audit console</Link>
        <Link href="/admin/theme">Theme studio</Link>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Object.entries(adminRequirements).map(([key, requirement]) => (
          <div key={key}>
            <DependencyState {...requirement} />
            <Link
              href={`/admin/${key}`}
              className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
            >
              View capability requirements
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
