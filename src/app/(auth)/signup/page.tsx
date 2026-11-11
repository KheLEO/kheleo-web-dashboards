import Link from "next/link";
import { RegistrationForm } from "@/features/auth/registration-form";

export default function SignupPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold">Create your account</h2>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Sign up to manage your sports profile, organize tournaments, or scout grassroots talent.
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
