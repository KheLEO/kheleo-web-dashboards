import { PageHeading } from "@/components/shared/page-heading";
import { ThemeStudio } from "@/features/admin/theme-studio";
export default function Page() {
  return (
    <>
      <PageHeading
        eyebrow="platform owner"
        title="Live theme studio"
        description="Experiment with a browser palette and export CSS for review."
      />
      <ThemeStudio />
    </>
  );
}
