import Link from "next/link";
import { Sparkles, IdCard, Trophy, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface UpcomingFeatureHighlight {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export interface UpcomingFeatureViewProps {
  badge?: string;
  title: string;
  subtitle: string;
  highlights: readonly UpcomingFeatureHighlight[];
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}

export function UpcomingFeatureView({
  badge = "UNDER PRODUCTION • UPCOMING FEATURE",
  title,
  subtitle,
  highlights,
  primaryAction = { label: "Go to Sports Passport", href: "/athlete/passport" },
  secondaryAction = { label: "Explore Tournaments", href: "/athlete/tournaments" },
}: UpcomingFeatureViewProps) {
  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-8">
      {/* HERO BANNER CARD */}
      <Card className="min-w-0 max-w-full overflow-hidden border border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-gold-glow">
        <div className="space-y-4">
          <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full">
            <Sparkles size={13} className="text-amber-400 animate-pulse" />
            <span>{badge}</span>
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
            {title}
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl break-words">
            {subtitle}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" className="gap-2">
              <Link href={primaryAction.href}>
                <IdCard size={15} />
                <span>{primaryAction.label}</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" className="gap-2">
              <Link href={secondaryAction.href}>
                <Trophy size={15} />
                <span>{secondaryAction.label}</span>
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* 3 FEATURE PREVIEW CARDS */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          What athletes will get when this goes live
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon ?? CheckCircle2;
            return (
              <Card
                key={item.title}
                className="flex flex-col justify-between border border-primary/20 bg-card p-5 hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground break-words">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground break-words">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-medium text-primary flex items-center gap-1">
                  <span>Launching soon in KheLEO</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
