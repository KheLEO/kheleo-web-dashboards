import { EventSelector } from "@/features/organizer/event-selector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { OwnedTournaments } from "@/features/organizer/owned-tournaments";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="Your tournaments"
        description="Your owned events, live status, and management tools"
      />
      <div className="mb-6">
        <Button asChild>
          <Link href="/organizer/tournaments/create">Create tournament</Link>
        </Button>
      </div>
      <div className="mb-6">
        <EventSelector />
      </div>
      <OwnedTournaments />
    </>
  );
}
