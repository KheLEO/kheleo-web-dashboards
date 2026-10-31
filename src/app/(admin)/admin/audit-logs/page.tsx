import { PageHeading } from "@/components/shared/page-heading";
import { AuditConsole } from "@/features/admin/audit-console";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="Security and integrity audit console"
        description="Review the backend requirements for identity, signatures, fair play and safety ledgers."
      />
      <AuditConsole />
    </>
  );
}
