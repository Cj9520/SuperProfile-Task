import { prisma } from "@/lib/db";

export async function listNotifications(userId: string, workspaceId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markAllRead(userId: string, workspaceId: string) {
  await prisma.notification.updateMany({
    where: { userId, workspaceId, read: false },
    data: { read: true },
  });
  return { message: "All notifications marked as read" };
}
