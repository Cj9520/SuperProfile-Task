import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { apiError, apiSuccess, checkRateLimit } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 min
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const body = await req.json();
    const data = loginSchema.safeParse(body);

    if (!data.success) {
      return apiError("Invalid email or password", 422);
    }

    const { email, password } = data.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaceMembers: {
          where: { inviteStatus: "accepted" },
          include: { workspace: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return apiError("Invalid email or password", 401);
    }

    if (user.globalStatus === "suspended") {
      return apiError("Your account has been suspended.", 403);
    }

    const membership = user.workspaceMembers[0];
    if (!membership) {
      return apiError("No workspace found for this account.", 404);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createSession({
      userId: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      memberId: membership.id,
    });

    return apiSuccess({
      user: { id: user.id, name: user.name, email: user.email },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return apiError("Internal server error", 500);
  }
}
