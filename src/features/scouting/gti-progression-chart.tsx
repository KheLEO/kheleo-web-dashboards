"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoutDossierProjection } from "@/contracts/scouting";
interface GtiProgressionChartProps {
  history: ScoutDossierProjection["gti_history"];
}
export function GtiProgressionChart({ history }: GtiProgressionChartProps) {
  if (!history.length) return <p>No recorded GTI history yet.</p>;
  return (
    <figure aria-label="Season-over-Season GTI Progression" className="min-w-0">
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={history}
            accessibilityLayer
            margin={{ top: 12, right: 15, bottom: 12, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="recorded_at"
              tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              minTickGap={50}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
                borderColor: "var(--border)",
              }}
            />
            <Area
              type="monotone"
              dataKey="gti"
              name="GTI"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Recorded calculations in chronological order, including their original trigger.
      </figcaption>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm">View progression data</summary>
        <ol className="mt-3 space-y-2 text-xs">
          {history.map((entry, index) => (
            <li key={`${entry.recorded_at}:${index}`}>
              {new Date(entry.recorded_at).toLocaleString()} · GTI {entry.gti.toFixed(1)} ·{" "}
              {entry.trigger_type}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
