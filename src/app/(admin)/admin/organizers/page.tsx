import { PageHeading } from "@/components/shared/page-heading";
import { GovernanceWorkspace } from "@/features/admin/governance-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title="Organizer verification"
        description="Authorized platform oversight"
      />
      <GovernanceWorkspace verificationQueue />
    </>
  );
}
