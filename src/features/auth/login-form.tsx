"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { loginSchema } from "@/contracts/auth";
import { homeForRole } from "@/server/auth/permissions";
import { authenticate } from "./api";
import { authFields } from "./schemas";
export function LoginForm() {
  const router = useRouter();
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={authFields}
      schema={loginSchema}
      submitLabel="Sign in securely"
      submit={async (_value, operation) => {
        const session = await authenticate("login", operation);
        window.dispatchEvent(new Event("kheleo:session-ended"));
        client.clear();
        router.replace(homeForRole(session.user.role));
        router.refresh();
      }}
    />
  );
}
