import Link from "next/link";
import { Radar, Bell, Map, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
export function ScoutOverview() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[
        {
          href: "/scout/feed",
          icon: Radar,
          title: "Find overlooked potential",
          text: "Explore searchable athletes with an elite GTI filter of 85 and above.",
        },
        {
          href: "/scout/alerts",
          icon: Bell,
          title: "Follow talent breakthroughs",
          text: "Review platform-generated talent alerts and acknowledge your discoveries.",
        },
        {
          href: "/scout/heatmaps",
          icon: Map,
          title: "See the regional picture",
          text: "Explore participation, average GTI, and female participation by district.",
        },
      ].map(({ href, icon: Icon, title, text }) => (
        <Link key={href} href={href}>
          <Card className="h-full hover:border-primary/50">
            <div className="flex justify-between text-primary">
              <Icon size={24} />
              <ArrowUpRight size={18} />
            </div>
            <h2 className="mt-8 text-lg font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
