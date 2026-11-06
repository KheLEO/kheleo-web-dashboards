"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserRoleValues,
  VerificationStatusValues,
  type UserRole,
  type VerificationStatus,
} from "@/contracts/enums.generated";
import { governanceSchema, type AdminUser, type AdminUsersQuery } from "@/contracts/admin";
import { useSession } from "@/features/auth/session-provider";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/shared/async-state";
import { LoadMore } from "@/components/shared/cursor-list";
import { UserInspector } from "./user-inspector";
import { governUser } from "./api";
import { useAdminUsers } from "./queries";
interface UserDecisionProps {
  target: AdminUser;
}
function UserDecision({ target }: UserDecisionProps) {
  const { user } = useSession();
  const client = useQueryClient();
  const [role, setRole] = useState<UserRole>(target.role);
  const [active, setActive] = useState(target.isActive);
  const [verification, setVerification] = useState<VerificationStatus | "">(
    target.identityRecord?.status ?? "",
  );
  const [validation, setValidation] = useState<string | null>(null);
  const operation = useRef<MutationOperation | null>(null);
  const flight = useRef(false);
  const mutation = useMutation({
    mutationFn: (action: MutationOperation) => governUser(target.id, action),
    onSettled: () => {
      flight.current = false;
    },
    onSuccess: () => {
      operation.current = null;
      for (const key of ["admin-users", "admin-dashboard", "admin-audit"])
        void client.invalidateQueries({ queryKey: [key, user.id] });
    },
  });
  function submit(payload: unknown): void {
    if (flight.current) return;
    const parsed = governanceSchema.safeParse(payload);
    if (!parsed.success) {
      setValidation(parsed.error.issues.map((issue) => issue.message).join(" · "));
      return;
    }
    setValidation(null);
    flight.current = true;
    operation.current = sameOperation(operation.current, parsed.data);
    mutation.mutate(operation.current);
  }
  const contact = target.email ?? target.phone ?? target.id;
  return (
    <Card role="group" aria-label={`Account ${contact}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="break-words font-semibold">{contact}</h3>
          <p className="mt-2 break-all text-xs">{target.id}</p>
        </div>
        <Badge>{target.identityRecord?.status ?? "NO_IDENTITY_RECORD"}</Badge>
      </div>
      <p className="my-4 text-sm">
        {target.role} · {target.isActive ? "Active" : "Inactive"} ·{" "}
        {target.identityRecord?.reLinkedCount ?? 0} identity relink attempts
      </p>
      {user.role === "SUPER_ADMIN" ? (
        <form
          aria-label={`Govern ${contact}`}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit({
              role,
              isActive: active,
              ...(verification ? { verificationStatus: verification } : {}),
            });
          }}
        >
          <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-3">
            <label className="field">
              Role
              <select
                className="control"
                aria-label={`Role for ${contact}`}
                value={role}
                onChange={(event) => {
                  const value = UserRoleValues.find((item) => item === event.target.value);
                  if (value) setRole(value);
                }}
              >
                {UserRoleValues.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Verification
              <select
                className="control"
                aria-label={`Verification for ${contact}`}
                value={verification}
                onChange={(event) => {
                  const value = VerificationStatusValues.find(
                    (item) => item === event.target.value,
                  );
                  setVerification(value ?? "");
                }}
              >
                <option value="">No bound identity record</option>
                {VerificationStatusValues.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Account active
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={mutation.isPending}>
              Save governance changes
            </Button>
            {target.identityRecord && target.identityRecord.status !== "VERIFIED" && (
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => submit({ verificationStatus: "VERIFIED", isActive: true })}
              >
                Approve credentials
              </Button>
            )}
            {target.identityRecord && target.identityRecord.status !== "REVOKED" && (
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => {
                  if (window.confirm(`Revoke access for ${contact}?`))
                    submit({ verificationStatus: "REVOKED", isActive: false });
                }}
              >
                Revoke credentials
              </Button>
            )}
          </div>
          {validation && <p role="alert">{validation}</p>}
          {mutation.error && <ErrorState error={mutation.error} />}{" "}
        </form>
      ) : (
        <p className="text-sm">User governance requires a super administrator.</p>
      )}
    </Card>
  );
}
interface GovernanceWorkspaceProps {
  verificationQueue?: boolean;
}
export function GovernanceWorkspace({ verificationQueue = false }: GovernanceWorkspaceProps) {
  const [role, setRole] = useState<UserRole | "">(verificationQueue ? "ORGANIZER" : "");
  const [verification, setVerification] = useState<VerificationStatus | "">(
    verificationQueue ? "UNVERIFIED" : "",
  );
  const [active, setActive] = useState("");
  const filters: AdminUsersQuery = {
    ...(role ? { role } : {}),
    ...(verification ? { verificationStatus: verification } : {}),
    ...(active ? { isActive: active === "true" } : {}),
  };
  const query = useAdminUsers(filters);
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-5 text-xl font-semibold">User and credential verification queue</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="field">
            Directory role
            <select
              aria-label="Directory role"
              className="control"
              value={role}
              onChange={(event) =>
                setRole(UserRoleValues.find((item) => item === event.target.value) ?? "")
              }
            >
              <option value="">All roles</option>
              {UserRoleValues.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Verification status
            <select
              aria-label="Verification status"
              className="control"
              value={verification}
              onChange={(event) =>
                setVerification(
                  VerificationStatusValues.find((item) => item === event.target.value) ?? "",
                )
              }
            >
              <option value="">All verification states</option>
              {VerificationStatusValues.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Account state
            <select
              aria-label="Account state"
              className="control"
              value={active}
              onChange={(event) => setActive(event.target.value)}
            >
              <option value="">All accounts</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Identity approval requires bound government identity evidence. Every decision revokes
          active refresh families and records an immutable audit event.
        </p>
      </Card>
      {query.isPending ? (
        <Skeleton />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !rows.length ? (
        <EmptyState>No accounts match this verification queue.</EmptyState>
      ) : (
        rows.map((target) => (
          <UserDecision
            key={`${target.id}:${target.role}:${target.isActive}:${target.identityRecord?.status}`}
            target={target}
          />
        ))
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        loading={query.isFetchingNextPage}
        load={() => {
          void query.fetchNextPage();
        }}
      />
      <UserInspector />
    </div>
  );
}
