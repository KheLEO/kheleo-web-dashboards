import { PageHeading } from "@/components/shared/page-heading";
import { WearablePanel } from "@/features/wearables/wearable-panel";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="connected athlete"
        title="Your biometric workspace"
        description="Connect supported hardware or explore clearly labeled simulated readings."
      />
      <WearablePanel />
    </>
  );
}
