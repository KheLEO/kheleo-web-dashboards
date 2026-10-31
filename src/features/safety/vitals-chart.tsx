import type { BiometricReading } from "@/features/wearables/types";
export function VitalsChart({
  readings,
}: {
  readings: readonly Pick<BiometricReading, "heartRate">[];
}) {
  const points = readings
    .slice(-60)
    .map(
      (reading, index) =>
        `${(index * 600) / 59},${130 - (Math.min(240, reading.heartRate) / 240) * 120}`,
    )
    .join(" ");
  return (
    <div className="mt-5 overflow-hidden rounded-lg border bg-background p-4">
      <p className="mb-4 text-xs text-muted-foreground">Heart rate · last 60 readings</p>
      <svg
        viewBox="0 0 600 140"
        className="w-full"
        role="img"
        aria-label={readings.length ? "Recent heart-rate readings" : "No heart-rate readings yet"}
      >
        <path d="M0 130 H600 M0 65 H600" stroke="rgb(var(--border))" fill="none" />
        <polyline points={points} fill="none" stroke="rgb(var(--chart-gti))" strokeWidth="2" />
      </svg>
    </div>
  );
}
