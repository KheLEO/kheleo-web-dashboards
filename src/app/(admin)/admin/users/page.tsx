import { PageHeading } from "@/components/shared/page-heading";
import { GovernanceWorkspace } from "@/features/admin/governance-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="User and organizer governance"
        description="Inspect known accounts and review moderation capability requirements."
      />
      <GovernanceWorkspace />
    </>
  );
}
