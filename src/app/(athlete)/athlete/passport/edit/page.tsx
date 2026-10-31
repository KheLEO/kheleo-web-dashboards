import { PageHeading } from "@/components/shared/page-heading";
import { PassportView } from "@/features/passport/passport-view";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="sports passport"
        title="Edit your passport"
        description="Keep your physical profile, location, and sport preferences current."
      />
      <PassportView edit />
    </>
  );
}
