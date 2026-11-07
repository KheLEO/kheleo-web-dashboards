import Link from "next/link";
import { ScanLine, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeading } from "@/components/shared/page-heading";
import { drillCatalog } from "@/features/drills/drill-catalog";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="movement intelligence"
        title="Understand your movement"
        description="Private, on-device pose tracking. Your camera frames stay in your browser."
      />
      <Alert>
        Sport-specific scoring is awaiting calibration. Tracking and angle feedback do not affect
        GTI.
      </Alert>
      <div className="mt-6 grid auto-rows-fr gap-5 sm:grid-cols-2">
        {drillCatalog.map((drill) => (
          <Link key={drill.id} href={`/athlete/drills/${drill.id}`} className="flex h-full">
            <Card className="flex h-full w-full flex-col hover:border-primary/50">
              <div className="flex justify-between text-primary">
                <ScanLine size={26} />
                <ArrowUpRight size={18} />
              </div>
              <h2 className="mt-7 text-xl font-semibold">{drill.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{drill.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
