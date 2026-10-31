import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="Your tournaments"
        description="Capability availability"
      />
      <DependencyState
        title="Your tournaments"
        description="A paginated organizer-owned event listing is not yet available. Open an event from the overview using its UUID, or create a new tournament."
      />
    </>
  );
}
