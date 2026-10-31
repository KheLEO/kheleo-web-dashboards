import { PageHeading } from "@/components/shared/page-heading";
import { AccountSettings } from "@/features/passport/settings";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="account"
        title="Account settings"
        description="Manage your contact details and permanent account."
      />
      <AccountSettings />
    </>
  );
}
