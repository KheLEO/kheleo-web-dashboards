import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="Tournament editing"
        description="Capability availability"
      />
      <DependencyState
        title="Tournament editing"
        description="The platform does not yet expose a tournament update API. Event details are available, but changes cannot be submitted."
      />
    </>
  );
}
