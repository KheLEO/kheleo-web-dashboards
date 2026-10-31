import { PageHeading } from "@/components/shared/page-heading";
import { WearablePanel } from "@/features/wearables/wearable-panel";
export default function IoTDevicePage() {
  return (
    <>
      <PageHeading
        eyebrow="Connected athlete"
        title="IoT wearable connection hub"
        description="Pair a Bluetooth heart-rate monitor or a clearly labeled virtual wearable."
      />
      <WearablePanel />
    </>
  );
}
