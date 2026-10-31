import { PageHeading } from "@/components/shared/page-heading";
import { AdminWorkspace } from "@/features/admin/admin-workspace";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="Platform administration"
        description="Administrative tools activate when their authorized backend capabilities are available."
      />
      <AdminWorkspace />
    </>
  );
}
