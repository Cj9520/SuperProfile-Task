import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, signInviteToken } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/team/members
export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: session.workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess({ members });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "agent"]),
});

// POST /api/team/members (invite)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const body = await req.json();
    const data = inviteSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const { email, role } = data.data;

    const workspace = await prisma.workspace.findUnique({
      where: { id: session.workspaceId },
    });
    if (!workspace) return apiError("Workspace not found", 404);

    const inviter = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: session.workspaceId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember && existingMember.inviteStatus === "accepted") {
        return apiError("This user is already a member of this workspace.", 409);
      }
    }

    // Create a pending placeholder member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: session.workspaceId,
        userId: existingUser?.id || session.userId, // Temporary; will be updated on accept
        role,
        inviteStatus: "pending",
        invitedByUserId: session.userId,
      },
    });

    const inviteToken = await signInviteToken({
      memberId: member.id,
      workspaceId: session.workspaceId,
      email,
    });

    await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { inviteToken },
    });

    try {
      await sendInviteEmail({
        to: email,
        workspaceName: workspace.name,
        inviterName: inviter?.name || "A teammate",
        inviteToken,
      });
    } catch (emailErr) {
      console.error("[invite:email]", emailErr);
      // Don't fail the request if email fails — return token for manual sharing
    }

    return apiSuccess({
      member: { id: member.id, email, role, inviteStatus: "pending" },
      inviteToken, // Return for testing without email
    }, 201);
  } catch (err) {
    console.error("[invite]", err);
    return apiError("Internal server error", 500);
  }
}
