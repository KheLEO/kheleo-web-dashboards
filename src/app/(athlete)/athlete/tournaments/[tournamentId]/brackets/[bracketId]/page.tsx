import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { TournamentDetailView } from "@/features/tournaments/tournament-detail";
export default async function Page({
  params: pending,
}: {
  params: Promise<{ tournamentId: string; bracketId: string }>;
}) {
  const params = await pending;
  if (Object.values(params).some((id) => !z.uuid().safeParse(id).success)) notFound();
  return (
    <>
      <PageHeading
        eyebrow="competition"
        title="Competition bracket"
        description="Fair competition, with platform-verified eligibility."
      />
      <TournamentDetailView tournamentId={params.tournamentId} bracketId={params.bracketId} />
    </>
  );
}
