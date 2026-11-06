import { PageHeading } from "@/components/shared/page-heading";
import { AuditConsole } from "@/features/admin/audit-console";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title="Duplicate identity audits"
        description="Authorized platform oversight"
      />
      <AuditConsole initialCategory="GOV_ID_RESET" />
    </>
  );
}
