"use client";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { governmentIdSchema, verificationSchema } from "@/contracts/auth";
import { mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import { sameOperation } from "@/lib/api/operation";
import { identityFields } from "./schemas";
export interface IdentityFormProps {
  idType?: string;
  onSuccess?: () => void;
}

export function IdentityForm({ idType = "AADHAAR", onSuccess }: IdentityFormProps = {}) {
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={identityFields}
      schema={governmentIdSchema}
      defaults={{ idType }}
      submitLabel="Verify and bind identity"
      submit={async (value, operation) => {
        const payload = {
          ...value,
          idType: value.idType || (idType as typeof value.idType),
        };
        return mutateApi(
          "auth/verify-government-id",
          envelope(verificationSchema),
          sameOperation(operation, payload),
        );
      }}
      onSuccess={() => {
        void client.invalidateQueries();
        onSuccess?.();
      }}
      successMessage="Identity verified and permanently bound to your account."
    />
  );
}
