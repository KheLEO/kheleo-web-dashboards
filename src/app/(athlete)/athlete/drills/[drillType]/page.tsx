import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { DrillCamera } from "@/features/drills/drill-camera";
import { drillCatalog, practicePresets } from "@/features/drills/drill-catalog";
export default async function Page({ params }: { params: Promise<{ drillType: string }> }) {
  const { drillType } = await params;
  const drill = drillCatalog.find((entry) => entry.id === drillType);
  if (!drill) notFound();
  return (
    <>
      <PageHeading
        eyebrow="on-device pose tracking"
        title={drill.name}
        description={drill.description}
      />
      <DrillCamera
        key={drill.id}
        {...(practicePresets.find((preset) => preset.id === drill.id)
          ? { preset: practicePresets.find((preset) => preset.id === drill.id)! }
          : {})}
      />
    </>
  );
}
