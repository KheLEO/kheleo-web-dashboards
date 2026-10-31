import { z } from "zod";
import { PageHeading } from "@/components/shared/page-heading";
import { MatchmakingHub } from "@/features/matchmaking/matchmaking-hub";
export default async function MatchmakingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const target = z.object({ tournamentId: z.uuid(), bracketId: z.uuid() }).safeParse(params);
  return (
    <>
      <PageHeading
        eyebrow="Dynamic matchmaking"
        title="Solo Free-Agent Pool"
        description="Join a real competition queue and receive your complementary roster in real time."
      />
      <MatchmakingHub {...(target.success ? { initial: target.data } : {})} />
    </>
  );
}
