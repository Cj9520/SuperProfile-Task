import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { signInviteToken } from "@/lib/auth";
import { sendInviteEmail } from "@/features/email/service";
import type { InviteInput, UpdateMemberInput } from "@/features/team/validation";

export async function listMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
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
  return { members };
}

/**
 * Invite a teammate by email. A brand-new invitee gets a real placeholder
 * `User` (globalStatus "invited") so the membership's `userId` is unique and
 * valid — the account is finalized when they accept. Re-inviting an existing
 * pending/revoked member reuses their membership row instead of colliding on
 * the `@@unique([workspaceId, userId])` constraint.
 */
export async function inviteMember(
  session: { workspaceId: string; userId: string },
  input: InviteInput
) {
  const { email, role } = input;

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
  });
  if (!workspace) throw new ApiError(404, "Workspace not found");

  const inviter = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  // Resolve (or create) the target user without reusing the inviter's id.
  let targetUser = await prisma.user.findUnique({ where: { email } });
  let existingMember = targetUser
    ? await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: session.workspaceId,
            userId: targetUser.id,
          },
        },
      })
    : null;

  if (existingMember?.inviteStatus === "accepted") {
    throw new ApiError(409, "This user is already a member of this workspace.");
  }

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: { email, name: email.split("@")[0], passwordHash: "", globalStatus: "invited" },
    });
  }

  // Create or refresh the pending membership.
  const member = existingMember
    ? await prisma.workspaceMember.update({
        where: { id: existingMember.id },
        data: { role, inviteStatus: "pending", invitedByUserId: session.userId },
      })
    : await prisma.workspaceMember.create({
        data: {
          workspaceId: session.workspaceId,
          userId: targetUser.id,
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
    // Don't fail the request if email fails — token is returned for manual sharing.
  }

  return {
    member: { id: member.id, email, role, inviteStatus: "pending" as const },
    inviteToken, // Returned for testing without email delivery.
  };
}

export async function updateMember(
  workspaceId: string,
  memberId: string,
  input: UpdateMemberInput
) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!member) throw new ApiError(404, "Member not found");

  // Prevent demoting the only admin.
  if (input.role === "agent" && member.role === "admin") {
    const adminCount = await prisma.workspaceMember.count({
      where: { workspaceId, role: "admin", inviteStatus: "accepted" },
    });
    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot demote the only admin");
    }
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { ...input },
  });
  return { member: updated };
}

export async function removeMember(workspaceId: string, memberId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!member) throw new ApiError(404, "Member not found");

  await prisma.workspaceMember.delete({ where: { id: memberId } });
  return { message: "Member removed" };
}
