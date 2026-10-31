import { PageHeading } from "@/components/shared/page-heading";
import { SportRecords } from "@/features/passport/sport-record-form";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="multi-sport profile"
        title="Your sport records"
        description="Manage your roles across sports. User-entered records are not independent verification."
      />
      <SportRecords />
    </>
  );
}
