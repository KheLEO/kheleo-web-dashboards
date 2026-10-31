import { ScoutDossierModal } from "@/components/scout/ScoutDossierModal";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ProspectSummary } from "@/contracts/scouting";
export function ProspectCard({ prospect }: { prospect: ProspectSummary }) {
  return (
    <Card>
      <div className="flex justify-between gap-3">
        <Badge>{prospect.primary_sport}</Badge>
        {prospect.is_rural_or_underrepresented && (
          <Badge className="border-info/30 bg-info/10 text-info">Underrepresented</Badge>
        )}
      </div>
      <div className="my-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Grassroots talent index
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums text-primary">
            {prospect.gti.toFixed(1)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{prospect.tier.replaceAll("_", " ")}</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin size={15} />
        {prospect.district}, {prospect.state}
      </p>
      <div className="my-5 grid grid-cols-3 gap-2 border-y py-4 text-xs">
        <div>
          <p className="text-muted-foreground">Form</p>
          <p className="mt-1 tabular-nums">{prospect.biomechanical_score}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Consistency</p>
          <p className="mt-1 tabular-nums">{prospect.training_consistency_score}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Match</p>
          <p className="mt-1 tabular-nums">{prospect.match_performance_score}</p>
        </div>
      </div>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        {prospect.alert_count} unacknowledged platform alerts. Verification, alert timestamps and
        GTI breakthrough delta are unavailable in this profile projection.
      </p>
      <div className="mb-4">
        <ScoutDossierModal userId={prospect.athlete_id} />
      </div>
      <Link
        className="flex items-center justify-between text-sm font-semibold text-primary"
        href={`/scout/athletes/${prospect.athlete_id}`}
      >
        View athlete passport <ArrowUpRight size={16} />
      </Link>
    </Card>
  );
}
