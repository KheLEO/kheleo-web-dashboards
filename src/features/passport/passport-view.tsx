"use client";
import { ApiError } from "@/lib/api/errors";
import { ErrorState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { usePassport } from "./queries";
import { PassportCard } from "./passport-card";
import { ProfileForm } from "./profile-form";
export function PassportView({ edit = false, userId }: { edit?: boolean; userId?: string }) {
  const query = usePassport(userId);
  if (query.isPending) return <Skeleton />;
  if (query.error)
    return !userId && query.error instanceof ApiError && query.error.problem.status === 404 ? (
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Create your sports passport</h2>
        <ProfileForm />
      </Card>
    ) : (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (!query.data) return null;
  return edit ? (
    <Card>
      <ProfileForm profile={query.data} />
    </Card>
  ) : (
    <PassportCard profile={query.data} editable={!userId} />
  );
}
