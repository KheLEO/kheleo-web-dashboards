import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { EventSelector } from "@/features/organizer/event-selector";
import { BracketWorkspace } from "@/features/organizer/bracket-workspace";
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
        title="Brackets and registrations"
        description="Open an event to configure GTI tiers and inspect roster-management availability."
      />
      {tournamentId ? (
        <BracketWorkspace key={tournamentId} tournamentId={tournamentId} />
      ) : (
        <EventSelector destination="brackets" />
      )}
    </>
  );
}
