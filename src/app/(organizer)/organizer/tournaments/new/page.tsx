import { PageHeading } from "@/components/shared/page-heading";
import { TournamentForm } from "@/features/tournaments/tournament-form";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="event management"
        title="Create a tournament"
        description="Define the event, venue, dates, team size, and prize pool."
      />
      <TournamentForm />
    </>
  );
}
