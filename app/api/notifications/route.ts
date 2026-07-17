import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/notifications — list recent notifications for current user
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.userId, workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return apiSuccess({ notifications, unreadCount });
}

// PATCH /api/notifications — mark all as read
export async function PATCH(_req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  await prisma.notification.updateMany({
    where: {
      userId: session.userId,
      workspaceId: session.workspaceId,
      read: false,
    },
    data: { read: true },
  });

  return apiSuccess({ message: "All notifications marked as read" });
}
