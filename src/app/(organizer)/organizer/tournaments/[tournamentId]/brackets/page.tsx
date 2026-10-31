import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { TournamentDetailView } from "@/features/tournaments/tournament-detail";
export default async function Page({
  params: pending,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const params = await pending;
  if (Object.values(params).some((id) => !z.uuid().safeParse(id).success)) notFound();
  return (
    <>
      <PageHeading
        eyebrow="competition"
        title="Competition brackets"
        description="Fair competition, with platform-verified eligibility."
      />
      <TournamentDetailView tournamentId={params.tournamentId} area="organizer" />
    </>
  );
}
