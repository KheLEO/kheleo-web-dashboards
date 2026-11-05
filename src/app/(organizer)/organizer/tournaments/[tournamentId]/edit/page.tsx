import { PageHeading } from "@/components/shared/page-heading";
import { TournamentEdit } from "@/features/organizer/tournament-edit";
import { z } from "zod";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  if (!z.uuid().safeParse(tournamentId).success) notFound();
  return (
    <>
      <PageHeading
        eyebrow="organizer"
        title="Tournament editing"
        description="Update your event, prize allocation, role quotas, venue, and dates."
      />
      <TournamentEdit tournamentId={tournamentId} />
    </>
  );
}
