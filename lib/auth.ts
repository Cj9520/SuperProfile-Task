import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32`."
  );
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

const COOKIE_NAME = "sp_session";
const TOKEN_EXPIRY = "7d";

export interface SessionPayload {
  userId: string;
  workspaceId: string;
  role: string;
  memberId: string;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Auth guard helpers ────────────────────────────────────────────────────────

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Authentication required");
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "admin") {
    throw new ApiError(403, "You do not have permission to perform this action");
  }
  return session;
}

// ─── Full user fetch ───────────────────────────────────────────────────────────

export async function getCurrentUser(session: SessionPayload) {
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      globalStatus: true,
      createdAt: true,
    },
  });
}

export async function getCurrentWorkspace(session: SessionPayload) {
  return prisma.workspace.findUnique({
    where: { id: session.workspaceId },
  });
}

// ─── Invite token helpers ─────────────────────────────────────────────────────

export async function signInviteToken(payload: {
  memberId: string;
  workspaceId: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ ...payload, type: "invite" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("72h")
    .sign(SECRET);
}

export async function verifyInviteToken(
  token: string
): Promise<{ memberId: string; workspaceId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== "invite") return null;
    return payload as unknown as {
      memberId: string;
      workspaceId: string;
      email: string;
    };
  } catch {
    return null;
  }
}
