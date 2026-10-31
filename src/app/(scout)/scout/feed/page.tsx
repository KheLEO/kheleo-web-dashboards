import { PageHeading } from "@/components/shared/page-heading";
import { ScoutFeed } from "@/features/scouting/scout-feed";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="scout and academy"
        title="Talent discovery feed"
        description="Explore elite searchable profiles and review platform-generated alerts."
      />
      <ScoutFeed />
    </>
  );
}
