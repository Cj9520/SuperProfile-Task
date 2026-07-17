import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — always allowed
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/invites/accept",
    "/api/widget",
    "/api/email/inbound",
    "/api/email/events",
    "/api/public",
    "/help",
    "/widget-demo",
  ];

  const isPublic =
    publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
    ) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/widget-loader") ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  const session = await getSessionFromRequest(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
