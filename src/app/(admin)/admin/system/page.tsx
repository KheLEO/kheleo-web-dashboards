import { PageHeading } from "@/components/shared/page-heading";
import { DependencyState } from "@/components/shared/dependency-state";
import { adminRequirements } from "@/features/admin/capability-requirements";
export default function Page() {
  const requirement = adminRequirements["system"];
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title={requirement.title}
        description="Authorized platform oversight"
      />
      <DependencyState {...requirement} />
    </>
  );
}
