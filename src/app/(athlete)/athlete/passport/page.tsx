import { PageHeading } from "@/components/shared/page-heading";
import { PassportView } from "@/features/passport/passport-view";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="sports passport"
        title="Your permanent sports identity"
        description="A multi-sport record of your profile, achievements, and development."
      />
      <PassportView />
    </>
  );
}
