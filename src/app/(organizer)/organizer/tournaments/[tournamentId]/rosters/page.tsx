import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="Roster management"
        description="Capability availability"
      />
      <DependencyState
        title="Roster management"
        description="Organizer registration lists, team reads, and authorized roster operations require additional backend contracts."
      />
    </>
  );
}
