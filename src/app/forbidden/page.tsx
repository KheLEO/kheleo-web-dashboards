import Link from "next/link";
export default function ForbiddenPage() {
  return (
    <main id="main-content" className="mx-auto max-w-xl p-10">
      <h1 className="page-title">Access restricted</h1>
      <p className="my-5 text-muted-foreground">
        Your account does not have access to this workspace.
      </p>
      <Link className="text-primary underline" href="/">
        Return to your workspace
      </Link>
    </main>
  );
}
