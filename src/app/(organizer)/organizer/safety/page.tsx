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
        description="Select an owned event to inspect observed safety alerts and test the local emergency workflow."
      />
      {tournamentId ? (
        <CommandCenter key={tournamentId} tournamentId={tournamentId} />
      ) : (
        <EventSelector destination="safety" />
      )}
    </>
  );
}
