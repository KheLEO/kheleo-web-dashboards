import { PageHeading } from "@/components/shared/page-heading";
import { LeaderboardWorkspace } from "@/features/leaderboards/leaderboard-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="National, state, and district leaderboards"
        description="Explore verified rankings by geography, sport, and demographic, then inspect athlete evidence."
      />
      <LeaderboardWorkspace />
    </>
  );
}
