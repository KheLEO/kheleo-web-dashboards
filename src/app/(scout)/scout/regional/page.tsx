import { PageHeading } from "@/components/shared/page-heading";
import { RegionalInsights } from "@/features/regional/regional-map";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="regional intelligence"
        title="Opportunity, on the map"
        description="Explore participation, GTI, and gender equity across returned districts."
      />
      <RegionalInsights />
    </>
  );
}
