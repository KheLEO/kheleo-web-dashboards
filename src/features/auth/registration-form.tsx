"use client";
import { useRef } from "react";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { registerSchema } from "@/contracts/auth";
import { authenticate } from "./api";
import { homeForRole } from "@/server/auth/permissions";
import { registrationFields } from "./schemas";

export function RegistrationForm() {
  const router = useRouter();
  const authenticatedOperation = useRef<MutationOperation | null>(null);
  const client = useQueryClient();

  return (
    <SchemaForm
      fields={registrationFields}
      defaults={{ role: "ATHLETE" }}
      schema={registerSchema}
      submitLabel="Create account"
      submit={async (value, operation) => {
        authenticatedOperation.current = sameOperation(operation, value);
        const session = await authenticate("register", authenticatedOperation.current);
        window.dispatchEvent(new Event("kheleo:session-ended"));
        client.clear();
        const destination = homeForRole(session.user.role);
        router.replace(destination);
        router.refresh();
      }}
    />
  );
}
