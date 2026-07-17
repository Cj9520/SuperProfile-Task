import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

const updateSchema = z.object({
  role: z.enum(["admin", "agent"]).optional(),
  inviteStatus: z.enum(["pending", "accepted", "revoked"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const body = await req.json();
    const data = updateSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const member = await prisma.workspaceMember.findFirst({
      where: { id: params.id, workspaceId: session.workspaceId },
    });
    if (!member) return apiError("Member not found", 404);

    // Prevent demoting the only admin
    if (data.data.role === "agent" && member.role === "admin") {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId: session.workspaceId, role: "admin", inviteStatus: "accepted" },
      });
      if (adminCount <= 1) {
        return apiError("Cannot demote the only admin", 400);
      }
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: params.id },
      data: { ...data.data },
    });

    return apiSuccess({ member: updated });
  } catch (err) {
    console.error("[team:patch]", err);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  const member = await prisma.workspaceMember.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!member) return apiError("Member not found", 404);

  await prisma.workspaceMember.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Member removed" });
}
