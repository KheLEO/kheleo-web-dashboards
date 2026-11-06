import { PageHeading } from "@/components/shared/page-heading";
import { AuditConsole } from "@/features/admin/audit-console";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="Security and integrity audit console"
        description="Review persisted identity, HMAC, fair-play, safety, and governance events."
      />
      <AuditConsole />
    </>
  );
}
