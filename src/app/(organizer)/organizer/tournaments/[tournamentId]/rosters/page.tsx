import { PageHeading } from "@/components/shared/page-heading";
import { BracketWorkspace } from "@/features/organizer/bracket-workspace";
import { z } from "zod";
import { notFound } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  if (!z.uuid().safeParse(tournamentId).success) notFound();
  return (
    <>
      <PageHeading
        eyebrow="organizer"
        title="Verified rosters and registrations"
        description="Inspect athlete verification, matchmaking queues, fair-play blocks, and match results."
      />
      <BracketWorkspace tournamentId={tournamentId} />
    </>
  );
}
