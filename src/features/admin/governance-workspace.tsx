import { UserInspector } from "./user-inspector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DependencyState } from "@/components/shared/dependency-state";
import { SportTypeValues } from "@/contracts/enums.generated";
import { practicePresets } from "@/features/drills/drill-catalog";
export function GovernanceWorkspace() {
  return (
    <div className="space-y-6">
      <UserInspector />
      <DependencyState
        title="Organizer and scout approval queue"
        description="A privileged account listing, credential evidence, verification/revocation decisions and audit records are not available. Existing accounts must be provisioned through an authorized external process."
      />
      <Card>
        <h2 className="mb-4 font-semibold">Credential decisions · unavailable</h2>
        <div className="flex flex-wrap gap-3">
          <Button disabled>Verify organizer / scout</Button>
          <Button disabled variant="destructive">
            Revoke credentials
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Contact editing and account deactivation are not credential review APIs.
        </p>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Supported sports and practice references</h2>
        <p className="text-sm">{SportTypeValues.join(" · ")}</p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {practicePresets.map((preset) => (
            <li key={preset.id}>{preset.name} · provisional practice alignment</li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          This is a read-only view of frontend contract enums and practice presets. Sport/model
          administration, calibrated scoring versions and model approval require backend APIs.
        </p>
      </Card>
    </div>
  );
}
