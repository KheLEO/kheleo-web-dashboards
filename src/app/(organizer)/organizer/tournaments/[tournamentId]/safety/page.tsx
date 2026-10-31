import { z } from "zod";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/shared/page-heading";
import { CommandCenter } from "@/features/safety/command-center";
export default async function Page({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  if (!z.uuid().safeParse(tournamentId).success) notFound();
  return (
    <>
      <PageHeading
        eyebrow="event safety"
        title="Safety command center"
        description="Critical biometric directives and connection visibility."
      />
      <CommandCenter key={tournamentId} tournamentId={tournamentId} />
    </>
  );
}
