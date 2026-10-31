import { PageHeading } from "@/components/shared/page-heading";
import { AlertsList } from "@/features/scouting/alerts-list";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="talent breakthroughs"
        title="Your talent alert feed"
        description="Review new platform alerts and mark discoveries as acknowledged."
      />
      <AlertsList />
    </>
  );
}
