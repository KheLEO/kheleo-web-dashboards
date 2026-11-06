import { PageHeading } from "@/components/shared/page-heading";
import { AuditConsole } from "@/features/admin/audit-console";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform administration"
        title="Drill security audits"
        description="Authorized platform oversight"
      />
      <AuditConsole initialCategory="DRILL_HMAC_TAMPER" />
    </>
  );
}
