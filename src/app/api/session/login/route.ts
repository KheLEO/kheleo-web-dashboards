import { sessionHandler } from "@/server/api/session-handler";
export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  return sessionHandler(request, "login");
}
