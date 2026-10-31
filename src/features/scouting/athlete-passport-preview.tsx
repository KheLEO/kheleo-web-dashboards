import { PassportView } from "@/features/passport/passport-view";
import { DependencyState } from "@/components/shared/dependency-state";
export function AthletePassportPreview({ userId }: { userId: string }) {
  return (
    <div className="space-y-6">
      <PassportView userId={userId} />
      <DependencyState
        title="Full scout dossier"
        description="The authorized athlete passport is available above. A flattened scout dossier, private notes, shortlisting, and pipeline actions require dedicated backend endpoints."
      />
    </div>
  );
}
