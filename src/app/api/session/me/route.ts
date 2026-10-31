import { sessionHandler } from "@/server/api/session-handler";
export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  return sessionHandler(request, "me");
}
