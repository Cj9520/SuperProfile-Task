/**
 * Edge-safe session verification — NO Prisma, NO Node.js APIs.
 * Used exclusively by proxy.ts (Edge Runtime).
 */
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "sp_session";
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32`."
  );
}
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export interface SessionPayload {
  userId: string;
  workspaceId: string;
  role: string;
  memberId: string;
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
