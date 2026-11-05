import { OwnedTournaments } from "@/features/organizer/owned-tournaments";
import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { EventSelector } from "@/features/organizer/event-selector";
import { CommandCenter } from "@/features/safety/command-center";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tournamentId?: string }>;
}) {
  const { tournamentId } = await searchParams;
  if (tournamentId && !z.uuid().safeParse(tournamentId).success) notFound();
  return (
    <>
      <PageHeading
        eyebrow="organizer"
        title="Safety command center"
        description="Select an owned event to monitor live vitals, acknowledge incidents, and record medical clearance."
      />
      {tournamentId ? (
        <CommandCenter key={tournamentId} tournamentId={tournamentId} />
      ) : (
        <div className="space-y-6">
          <OwnedTournaments />
          <EventSelector destination="safety" />
        </div>
      )}
    </>
  );
}
