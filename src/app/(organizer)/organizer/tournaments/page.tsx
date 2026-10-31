import { EventSelector } from "@/features/organizer/event-selector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="Your tournaments"
        description="Capability availability"
      />
      <div className="mb-6">
        <Button asChild>
          <Link href="/organizer/tournaments/create">Create tournament</Link>
        </Button>
      </div>
      <div className="mb-6">
        <EventSelector />
      </div>
      <DependencyState
        title="Your tournaments"
        description="A paginated organizer-owned event listing is not yet available. Open an event from the overview using its UUID, or create a new tournament."
      />
    </>
  );
}
