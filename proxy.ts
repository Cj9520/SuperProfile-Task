import { NextResponse } from "next/server";
// ⚠️ Import ONLY from auth-edge (no Prisma) — this file runs in Edge Runtime
import { getSessionFromRequest } from "@/lib/auth-edge";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths — always allowed
  const publicPrefixes = [
    "/",
    "/login",
    "/signup",
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/verify-email",
    "/api/invites/accept",
    "/invite",
    "/api/widget",
    "/api/email",
    "/api/public",
    "/help",
    "/widget-demo",
    "/widget",
    "/_next",
    "/favicon",
    "/widget-loader",
  ];

  const isPublic =
    publicPrefixes.some(
      (p) =>
        pathname === p ||
        pathname.startsWith(p + "/") ||
        pathname.startsWith(p + "?")
    ) || pathname.includes(".");

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
