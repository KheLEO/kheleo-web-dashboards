import { PageHeading } from "@/components/shared/page-heading";
import { ScoutOverview } from "@/features/scouting/scout-overview";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="talent intelligence"
        title="Discover the next generation"
        description="Find potential, follow breakthroughs, and understand regional opportunity."
      />
      <ScoutOverview />
    </>
  );
}
