"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { registerSchema } from "@/contracts/auth";
import { authenticate } from "./api";
import { authFields } from "./schemas";
export function RegistrationForm() {
  const router = useRouter();
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={authFields}
      schema={registerSchema}
      submitLabel="Create athlete account"
      submit={async (_value, operation) => {
        await authenticate("register", operation);
        window.dispatchEvent(new Event("kheleo:session-ended"));
        client.clear();
        router.replace("/athlete/passport");
        router.refresh();
      }}
    />
  );
}
