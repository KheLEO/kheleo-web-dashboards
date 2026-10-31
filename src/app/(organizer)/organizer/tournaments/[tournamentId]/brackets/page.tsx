import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { BracketWorkspace } from "@/features/organizer/bracket-workspace";
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
      <BracketWorkspace tournamentId={params.tournamentId} />
    </>
  );
}
