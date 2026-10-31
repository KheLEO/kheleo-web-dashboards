import { PageHeading } from "@/components/shared/page-heading";
import { SportsPassportCard } from "@/components/athlete/SportsPassportCard";

export default function Page() {
  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow="sports passport"
        title="Your permanent sports identity"
        description="A verified, multi-sport record of your identity, GTI calculation, and achievements."
      />
      <SportsPassportCard />
    </div>
  );
}
