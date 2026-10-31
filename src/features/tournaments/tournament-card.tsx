import Link from "next/link";
import { MapPin, ArrowUpRight, CalendarDays } from "lucide-react";
import type { TournamentLocation } from "@/contracts/tournaments";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
export function TournamentCard({ tournament }: { tournament: TournamentLocation }) {
  return (
    <Card>
      <div className="flex justify-between gap-3">
        <Badge>{tournament.sport}</Badge>
        <span className="text-xs text-muted-foreground">{tournament.distanceKm} km away</span>
      </div>
      <h2 className="mt-5 text-lg font-semibold">
        <Link
          href={`/athlete/tournaments/${tournament.id}`}
          className="flex items-start justify-between gap-3 hover:text-primary"
        >
          {tournament.name}
          <ArrowUpRight size={18} className="shrink-0" />
        </Link>
      </h2>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin size={14} />
        {tournament.venueName}
      </p>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays size={14} />
        {formatDate(tournament.startDate)}
      </p>
      <div className="mt-5 flex flex-wrap justify-between gap-3 border-t pt-4 text-xs">
        <span>
          GTI{" "}
          <strong className="text-primary">
            {tournament.minGti}–{tournament.maxGti}
          </strong>
        </span>
        <span className="text-muted-foreground">
          Prize{" "}
          {tournament.prizePool === undefined ? "Not specified" : formatMoney(tournament.prizePool)}
        </span>
      </div>
    </Card>
  );
}
