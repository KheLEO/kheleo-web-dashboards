"use client";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useSession } from "@/features/auth/session-provider";
import { IdentityForm } from "@/features/auth/identity-form";
import { SchemaForm } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/async-state";
import { updateUserSchema, userSchema } from "@/contracts/users";
import { browserClient, getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import { createOperation, type MutationOperation } from "@/lib/api/operation";
import { asApiError } from "@/lib/api/errors";
export function AccountSettings() {
  const { user } = useSession();
  const client = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const operation = useRef<MutationOperation | null>(null);
  const query = useQuery({
    queryKey: ["contact", user.id],
    queryFn: ({ signal }) => getApi(`users/${user.id}`, envelope(userSchema), undefined, signal),
  });
  return (
    <div className="space-y-6">
      <IdentityForm isVerified={user.isVerified} />
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Contact details</h2>
        {query.error ? (
          <ErrorState error={query.error} />
        ) : (
          query.data && (
            <SchemaForm
              schema={updateUserSchema}
              fields={[
                { name: "email", label: "Email", type: "email" },
                { name: "phone", label: "Phone", type: "tel" },
              ]}
              defaults={{ email: query.data.email ?? "", phone: query.data.phone ?? "" }}
              submitLabel="Update contact"
              submit={(_value, action) =>
                mutateApi(`users/${user.id}`, envelope(userSchema), action, "PATCH")
              }
              onSuccess={() => {
                void client.invalidateQueries({ queryKey: ["contact", user.id] });
              }}
            />
          )
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Deactivate your account</h2>
        <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
          Your permanent sports identity remains bound. Deactivation does not reset your GTI or
          remove historical achievements.
        </p>
        <Dialog
          title="Deactivate account?"
          description="You will be signed out. Your government identity and historical sports profile remain linked."
          trigger={<Button variant="destructive">Deactivate account</Button>}
        >
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              operation.current ??= createOperation({});
              try {
                await mutateApi(
                  `users/${user.id}`,
                  envelope(userSchema),
                  operation.current,
                  "DELETE",
                );
                await browserClient.post("/session/logout");
                window.dispatchEvent(new Event("kheleo:session-ended"));
                client.clear();
                router.replace("/login");
                router.refresh();
              } catch (failure: unknown) {
                setError(asApiError(failure));
              } finally {
                setPending(false);
              }
            }}
          >
            Confirm deactivation
          </Button>
          {error && (
            <div className="mt-4">
              <ErrorState error={error} />
            </div>
          )}
        </Dialog>
      </Card>
    </div>
  );
}
