import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 min (verification tokens must not
  // be brute-forceable).
  if (!checkRateLimit(`verify-email:${getClientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.redirect(new URL("/login?error=too_many_attempts", req.url));
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token || token.length > 64) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", req.url)
    );
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", req.url)
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
    },
  });

  return NextResponse.redirect(
    new URL("/login?verified=1", req.url)
  );
}
