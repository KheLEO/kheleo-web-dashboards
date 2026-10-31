import { PageHeading } from "@/components/shared/page-heading";
import { IdentityForm } from "@/features/auth/identity-form";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="identity"
        title="One athlete. One identity."
        description="Bind your government identity to preserve your achievements and GTI."
      />
      <IdentityForm />
    </>
  );
}
