import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { BracketForm } from "@/features/tournaments/bracket-form";
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
        title="Create a bracket"
        description="Fair competition, with platform-verified eligibility."
      />
      <BracketForm tournamentId={params.tournamentId} />
    </>
  );
}
