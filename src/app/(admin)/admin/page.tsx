import { PageHeading } from "@/components/shared/page-heading";
import { AdminWorkspace } from "@/features/admin/admin-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="Platform administration"
        description="Live platform metrics, governance decisions, and immutable security evidence."
      />
      <AdminWorkspace />
    </>
  );
}
