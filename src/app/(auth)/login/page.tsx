import Link from "next/link";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <h2 className="text-2xl font-semibold">Welcome back</h2>
      <p className="mb-7 mt-2 text-sm text-muted-foreground">
        Sign in with your email or phone number and password.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-muted-foreground">
        New to KheLEO?{" "}
        <Link className="text-primary underline underline-offset-4" href="/signup">
          Create your account
        </Link>
      </p>
    </>
  );
}
