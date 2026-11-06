import { PageHeading } from "@/components/shared/page-heading";
import { SystemHealth } from "@/features/admin/system-health";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title="Platform health monitoring"
        description="Authorized platform oversight"
      />
      <SystemHealth />
    </>
  );
}
