"use client";
import { ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api/errors";
import { ErrorState } from "@/components/shared/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { IdentityForm } from "@/features/auth/identity-form";
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
  const isVerified = query.data.identityStatus === "VERIFIED";
  return (
    <div className="space-y-6">
      {edit ? (
        <Card>
          <ProfileForm profile={query.data} />
        </Card>
      ) : (
        <PassportCard profile={query.data} editable={!userId} />
      )}
      {!isVerified && !userId && (
        <Card className="border-amber-500/30 bg-card p-6 shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold">Verify Your Aadhaar</h3>
              <p className="text-xs text-muted-foreground">
                Bind your 12-digit Aadhaar to secure your sports passport and enable official
                tournament participation.
              </p>
            </div>
          </div>
          <IdentityForm idType="AADHAAR" />
        </Card>
      )}
    </div>
  );
}
