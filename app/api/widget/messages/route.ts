import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess, checkRateLimit } from "@/lib/utils";
import {
  broadcastToConversation,
  broadcastToWorkspace,
  PUSHER_EVENTS,
} from "@/lib/pusher";

const messageSchema = z.object({
  visitorToken: z.string().min(1),
  bodyText: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`widget-msg:${ip}`, 20, 60 * 1000)) {
    return apiError("Too many messages. Slow down.", 429);
  }

  try {
    const body = await req.json();
    const data = messageSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const chatSession = await prisma.chatSession.findUnique({
      where: { visitorToken: data.data.visitorToken },
      include: { conversation: true },
    });
    if (!chatSession || !chatSession.conversationId) {
      return apiError("Session not found", 404);
    }

    const message = await prisma.message.create({
      data: {
        conversationId: chatSession.conversationId,
        workspaceId: chatSession.workspaceId,
        senderType: "customer",
        bodyText: data.data.bodyText,
        bodyHtml: `<p>${data.data.bodyText}</p>`,
        channel: "chat",
        direction: "inbound",
        deliveryStatus: "received",
      },
    });

    await prisma.conversation.update({
      where: { id: chatSession.conversationId },
      data: { lastMessageAt: new Date(), status: "open" },
    });

    // Broadcast to agents
    await Promise.all([
      broadcastToConversation(
        chatSession.conversationId,
        PUSHER_EVENTS.NEW_MESSAGE,
        { message }
      ),
      broadcastToWorkspace(
        chatSession.workspaceId,
        PUSHER_EVENTS.NEW_MESSAGE,
        { conversationId: chatSession.conversationId, message }
      ),
    ]);

    return apiSuccess({ message }, 201);
  } catch (err) {
    console.error("[widget:messages]", err);
    return apiError("Internal server error", 500);
  }
}

// GET /api/widget/messages?visitorToken=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitorToken = searchParams.get("visitorToken");
  if (!visitorToken) return apiError("visitorToken required", 400);

  const chatSession = await prisma.chatSession.findUnique({
    where: { visitorToken },
  });
  if (!chatSession || !chatSession.conversationId) {
    return apiSuccess({ messages: [] });
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: chatSession.conversationId,
      channel: { not: "internal_note" },
    },
    orderBy: { createdAt: "asc" },
    include: {
      senderUser: { select: { name: true, avatarUrl: true } },
    },
  });

  return apiSuccess({ messages, conversationId: chatSession.conversationId });
}
