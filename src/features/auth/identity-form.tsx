"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { governmentIdSchema, verificationSchema } from "@/contracts/auth";
import { mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import { identityFields } from "./schemas";
export function IdentityForm() {
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={identityFields}
      schema={governmentIdSchema}
      submitLabel="Verify and bind identity"
      submit={(_value, operation) =>
        mutateApi("auth/verify-government-id", envelope(verificationSchema), operation)
      }
      onSuccess={() => {
        void client.invalidateQueries();
      }}
      successMessage="Identity verified and permanently bound to your account."
    />
  );
}
