"use client";
import { ApiError } from "@/lib/api/errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert danger>
      <p>{error.message}</p>
      {error instanceof ApiError && error.problem.invalidParams && (
        <ul className="mt-2 list-inside list-disc">
          {error.problem.invalidParams.map((field) => (
            <li key={field.name + field.reason}>
              {field.name}: {field.reason}
            </li>
          ))}
        </ul>
      )}
      {retry && (
        <Button className="mt-3" variant="secondary" onClick={retry}>
          Retry request
        </Button>
      )}
    </Alert>
  );
}
export function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
