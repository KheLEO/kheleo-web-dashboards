import { PageHeading } from "@/components/shared/page-heading";
import { TournamentDiscovery } from "@/features/tournaments/discovery-filters";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="competition discovery"
        title="Find your next arena"
        description="Explore nearby open tournaments and discover your competition tier."
      />
      <TournamentDiscovery />
    </>
  );
}
