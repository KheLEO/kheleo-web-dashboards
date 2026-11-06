"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { useContactProof } from "./use-contact-proof";
import { sameOperation, type MutationOperation } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { registerSchema } from "@/contracts/auth";
import { authenticate } from "./api";
import { homeForRole } from "@/server/auth/permissions";
import { authFields } from "./schemas";
export function RegistrationForm() {
  const router = useRouter();
  const proof = useContactProof();
  const authenticatedOperation = useRef<MutationOperation | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const client = useQueryClient();
  if (pendingRole)
    return (
      <Alert>
        Your {pendingRole.toLowerCase()} account is registered and awaiting administrator identity
        review.{" "}
        <Link className="underline" href="/login">
          Sign in after approval
        </Link>
        .
      </Alert>
    );
  return (
    <>
      {proof.dialog}
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
        submit={async (value, operation) => {
          const identityAccessToken = await proof.verify(value, true);
          authenticatedOperation.current = identityAccessToken
            ? sameOperation(authenticatedOperation.current, { ...value, identityAccessToken })
            : operation;
          const session = await authenticate("register", authenticatedOperation.current);
          if (["ORGANIZER", "SCOUT"].includes(session.user.role) && !session.user.isVerified) {
            setPendingRole(session.user.role);
            client.clear();
            return;
          }
          window.dispatchEvent(new Event("kheleo:session-ended"));
          client.clear();
          router.replace(
            session.user.role === "ATHLETE" ? "/athlete/passport" : homeForRole(session.user.role),
          );
          router.refresh();
        }}
      />
    </>
  );
}
