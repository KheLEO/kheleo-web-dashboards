import { PageHeading } from "@/components/shared/page-heading";
import { AthleteOverview } from "@/features/passport/athlete-overview";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="athlete"
        title="Your athlete workspace"
        description="Your identity, your progress, and your next opportunity."
      />
      <AthleteOverview />
    </>
  );
}
