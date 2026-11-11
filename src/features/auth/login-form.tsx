"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { loginSchema, normalizeLoginPayload } from "@/contracts/auth";
import { homeForRole } from "@/server/auth/permissions";
import { authenticate } from "./api";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { loginFields } from "./schemas";

export function LoginForm() {
  const router = useRouter();
  const authenticatedOperation = useRef<MutationOperation | null>(null);
  const client = useQueryClient();
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (fallback.current) clearTimeout(fallback.current);
    },
    [],
  );

  return (
    <SchemaForm
      fields={loginFields}
      schema={loginSchema}
      submitLabel="Sign in securely"
      submit={async (value, operation) => {
        const payload = normalizeLoginPayload(value);
        authenticatedOperation.current = sameOperation(operation, payload);
        const session = await authenticate("login", authenticatedOperation.current);
        window.dispatchEvent(new Event("kheleo:session-ended"));
        client.clear();
        const destination = homeForRole(session.user.role);
        if (fallback.current) clearTimeout(fallback.current);
        fallback.current = setTimeout(() => {
          if (window.location.pathname === "/login")
            window.location.replace(new URL(destination, window.location.origin).href);
        }, 10000);
        router.replace(destination);
      }}
    />
  );
}
