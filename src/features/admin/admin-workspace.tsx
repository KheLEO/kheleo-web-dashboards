import Link from "next/link";
import { adminRequirements } from "./capability-requirements";
import { DependencyState } from "@/components/shared/dependency-state";
export function AdminWorkspace() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        {Object.entries(adminRequirements).map(([key, requirement]) => (
          <div key={key}>
            <DependencyState {...requirement} />
            <Link
              href={`/admin/${key}`}
              className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
            >
              View capability requirements
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
