export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Process readiness must work before a visitor has an authenticated session. */
export async function GET(): Promise<Response> {
  const revision = process.env.RAILWAY_GIT_COMMIT_SHA;
  return Response.json(
    {
      status: "ok",
      revision: revision && /^[a-f\d]{40}$/i.test(revision) ? revision : "unknown",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
