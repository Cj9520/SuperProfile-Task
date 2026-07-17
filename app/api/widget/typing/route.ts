import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";
import { broadcastToConversation, broadcastToWorkspace, PUSHER_EVENTS } from "@/lib/pusher";

const typingSchema = z.object({
  visitorToken: z.string().min(1),
  isTyping: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = typingSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const chatSession = await prisma.chatSession.findUnique({
      where: { visitorToken: data.data.visitorToken },
    });
    if (!chatSession || !chatSession.conversationId) {
      return apiError("Session not found", 404);
    }

    const event = data.data.isTyping ? PUSHER_EVENTS.TYPING_START : PUSHER_EVENTS.TYPING_STOP;
    await Promise.all([
      broadcastToConversation(chatSession.conversationId, event, {
        source: "customer",
        visitorToken: data.data.visitorToken,
      }),
      broadcastToWorkspace(chatSession.workspaceId, event, {
        conversationId: chatSession.conversationId,
        source: "customer",
      }),
    ]);

    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[widget:typing]", err);
    return apiError("Internal server error", 500);
  }
}
