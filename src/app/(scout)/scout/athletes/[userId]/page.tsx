import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { AthletePassportPreview } from "@/features/scouting/athlete-passport-preview";
export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) notFound();
  return (
    <>
      <PageHeading
        eyebrow="athlete intelligence"
        title="Athlete passport preview"
        description="Authorized sports passport data. Full dossiers await platform support."
      />
      <AthletePassportPreview userId={userId} />
    </>
  );
}
