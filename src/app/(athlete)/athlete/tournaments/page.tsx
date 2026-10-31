import { PageHeading } from "@/components/shared/page-heading";
import { TournamentDiscovery } from "@/features/tournaments/discovery-filters";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="Geospatial discovery"
        title="Find your next arena"
        description="Nearby competition, skill brackets, and fair-play registration."
      />
      <TournamentDiscovery />
    </>
  );
}
