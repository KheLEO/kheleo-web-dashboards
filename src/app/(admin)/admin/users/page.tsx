import { PageHeading } from "@/components/shared/page-heading";
import { GovernanceWorkspace } from "@/features/admin/governance-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="User and organizer governance"
        description="Review verification evidence, manage roles and access, and inspect known accounts."
      />
      <GovernanceWorkspace />
    </>
  );
}
