import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-xl p-10">
      <h1 className="page-title">Page not found</h1>
      <p className="my-5 text-muted-foreground">This page does not exist.</p>
      <Link className="text-primary underline" href="/">
        Return to KheLEO
      </Link>
    </main>
  );
}
