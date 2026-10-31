import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Dashboard alias redirects
  if (pathname === "/athlete/dashboard") {
    return NextResponse.redirect(new URL("/athlete", request.url));
  }
  if (pathname === "/organizer/dashboard") {
    return NextResponse.redirect(new URL("/organizer", request.url));
  }
  if (pathname === "/scout/dashboard") {
    return NextResponse.redirect(new URL("/scout", request.url));
  }
  if (pathname === "/admin/dashboard") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 2. Demo role or active session detection for auth pages
  const sessionCookie = request.cookies.get("kheleo_session")?.value;
  const demoRoleCookie = request.cookies.get("kheleo_demo_role")?.value;

  const isAuthPage =
    pathname === "/login" || pathname === "/signup" || pathname === "/register";

  if (isAuthPage && demoRoleCookie) {
    const role = demoRoleCookie.toUpperCase();
    if (role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (role === "ORGANIZER") {
      return NextResponse.redirect(new URL("/organizer", request.url));
    }
    if (role === "SCOUT") {
      return NextResponse.redirect(new URL("/scout", request.url));
    }
    if (role === "ATHLETE") {
      return NextResponse.redirect(new URL("/athlete", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/athlete/dashboard",
    "/organizer/dashboard",
    "/scout/dashboard",
    "/admin/dashboard",
    "/login",
    "/signup",
    "/register",
  ],
};
