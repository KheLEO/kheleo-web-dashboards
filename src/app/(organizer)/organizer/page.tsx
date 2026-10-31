import { PageHeading } from "@/components/shared/page-heading";
import { OrganizerOverview } from "@/features/tournaments/organizer-overview";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="organizer"
        title="Make every match count"
        description="Create fair competition and open the tools available for your events."
      />
      <OrganizerOverview />
    </>
  );
}
