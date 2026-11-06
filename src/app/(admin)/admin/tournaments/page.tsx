import { PageHeading } from "@/components/shared/page-heading";
import { TournamentModeration } from "@/features/admin/tournament-moderation";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title="Tournament moderation"
        description="Authorized platform oversight"
      />
      <TournamentModeration />
    </>
  );
}
