import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { PoolStatus } from "@/features/matchmaking/pool-status";
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
        title="Your free-agent pool"
        description="Fair competition, with platform-verified eligibility."
      />
      <PoolStatus tournamentId={params.tournamentId} bracketId={params.bracketId} />
    </>
  );
}
