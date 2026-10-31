import { PageHeading } from "@/components/shared/page-heading";
import { ProspectDiscovery } from "@/features/scouting/prospect-filters";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="scout discovery"
        title="Potential beyond the spotlight"
        description="Search platform-ranked athletes and identify underrepresented talent."
      />
      <ProspectDiscovery />
    </>
  );
}
