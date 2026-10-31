import Link from "next/link";
export default function UnsupportedPage() {
  return (
    <main id="main-content" className="mx-auto max-w-xl p-10">
      <h1 className="page-title">Umpire workspace pending</h1>
      <p className="my-5 text-muted-foreground">
        Your account is recognized. Dedicated umpire tools are outside this release.
      </p>
      <Link className="text-primary underline" href="/login">
        Return to sign in
      </Link>
    </main>
  );
}
