import Link from "next/link";
import { RegistrationForm } from "@/features/auth/registration-form";

export default function SignupPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold">Create your athlete account</h2>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Register with your contact details and government identity. Organizer and scout accounts
        require authorized provisioning.
      </p>
      <RegistrationForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already registered?{" "}
        <Link className="text-primary underline underline-offset-4" href="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}
