import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyInviteToken, createSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = acceptSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const { token, name, password } = data.data;

    const payload = await verifyInviteToken(token);
    if (!payload) return apiError("Invite link expired or invalid", 410);

    const member = await prisma.workspaceMember.findUnique({
      where: { id: payload.memberId },
      include: { workspace: true },
    });

    if (!member || member.inviteStatus !== "pending") {
      return apiError("Invite link expired or invalid", 410);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: payload.email } });

    const result = await prisma.$transaction(async (tx) => {
      if (!user) {
        user = await tx.user.create({
          data: {
            email: payload.email,
            passwordHash,
            name,
            globalStatus: "active",
          },
        });
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, name },
        });
      }

      const updatedMember = await tx.workspaceMember.update({
        where: { id: member.id },
        data: {
          userId: user!.id,
          inviteStatus: "accepted",
          inviteToken: null,
        },
      });

      return { user: user!, member: updatedMember };
    });

    await createSession({
      userId: result.user.id,
      workspaceId: member.workspaceId,
      role: member.role,
      memberId: member.id,
    });

    return apiSuccess({
      user: { id: result.user.id, name: result.user.name, email: result.user.email },
      workspace: {
        id: member.workspace.id,
        name: member.workspace.name,
        slug: member.workspace.slug,
      },
    });
  } catch (err) {
    console.error("[invite:accept]", err);
    return apiError("Internal server error", 500);
  }
}
