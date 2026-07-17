import { getSession, getCurrentUser, getCurrentWorkspace } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const [user, workspace] = await Promise.all([
    getCurrentUser(session),
    getCurrentWorkspace(session),
  ]);

  if (!user || !workspace) return apiError("Session invalid", 401);

  const member = await prisma.workspaceMember.findUnique({
    where: { id: session.memberId },
  });

  return apiSuccess({
    user,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      widgetToken: workspace.widgetToken,
      supportEmail: workspace.supportEmail,
    },
    member: {
      id: session.memberId,
      role: session.role,
      inviteStatus: member?.inviteStatus,
    },
  });
}
