import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card role="group" aria-label={label}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-widest">{label}</span>
        <Icon size={17} />
      </div>
      <p className="my-3 text-3xl font-semibold tabular-nums text-primary">{value}</p>
      <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
    </Card>
  );
}
