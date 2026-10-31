import { relay } from "@/server/api/relay";
export const runtime = "nodejs";
interface Context {
  params: Promise<{ path: string[] }>;
}
async function handler(request: Request, context: Context): Promise<Response> {
  return relay(request, (await context.params).path);
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
