import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL(request.nextUrl.pathname.replace(/\/dashboard$/, ""), request.url),
  );
}
export const config = { matcher: ["/admin/dashboard"] };
