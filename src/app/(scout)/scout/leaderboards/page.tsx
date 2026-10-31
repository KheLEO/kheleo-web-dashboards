import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="workspace"
        title="National, state, and district leaderboards"
        description="Capability availability"
      />
      <DependencyState
        title="National, state, and district leaderboards"
        description="Paginated leaderboard listing is not yet exposed. Individual athlete national and district rank are available in the athlete workspace."
      />
    </>
  );
}
