"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { registerSchema } from "@/contracts/auth";
import { authenticate } from "./api";
import { homeForRole } from "@/server/auth/permissions";
import { authFields } from "./schemas";
export function RegistrationForm() {
  const router = useRouter();
  const client = useQueryClient();
  return (
    <SchemaForm
      fields={[
        {
          name: "role",
          label: "Account role",
          type: "select",
          options: ["ATHLETE", "ORGANIZER", "SCOUT"],
          required: true,
          hint: "Organizer and scout access requires administrator verification.",
        },
        ...authFields,
      ]}
      defaults={{ role: "ATHLETE" }}
      schema={registerSchema}
      submitLabel="Create athlete account"
      submit={async (_value, operation) => {
        const session = await authenticate("register", operation);
        window.dispatchEvent(new Event("kheleo:session-ended"));
        client.clear();
        router.replace(
          session.user.role === "ATHLETE" ? "/athlete/passport" : homeForRole(session.user.role),
        );
        router.refresh();
      }}
    />
  );
}
