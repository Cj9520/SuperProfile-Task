import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { broadcastToWidget } from "@/lib/pusher";

// POST /api/conversations/:id/read — mark all inbound messages as read
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!conversation) return apiError("Conversation not found", 404);

  // Find messages that are unread
  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId: params.id,
      readAt: null,
      senderType: { in: ["customer", "system"] },
    },
    select: { id: true },
  });

  if (unreadMessages.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadMessages.map((m) => m.id) } },
      data: { readAt: new Date() },
    });

    // Broadcast read receipt to widget so customer sees tick marks
    const chatSession = await prisma.chatSession.findFirst({
      where: { conversationId: params.id },
    });
    if (chatSession) {
      await broadcastToWidget(chatSession.visitorToken, "message-read", {
        messageIds: unreadMessages.map((m) => m.id),
        readAt: new Date().toISOString(),
      });
    }
  }

  return apiSuccess({ ok: true, readCount: unreadMessages.length });
}

