import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import {
  broadcastToWorkspace,
  broadcastToConversation,
  broadcastToWidget,
  PUSHER_EVENTS,
} from "@/lib/pusher";
import { sendSupportReply } from "@/lib/email";

// GET /api/conversations/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: {
      contact: true,
      assignee: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          senderUser: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      aiSummary: true,
      _count: { select: { messages: true } },
    },
  });

  if (!conversation) return apiError("Conversation not found", 404);

  return apiSuccess({ conversation });
}

const patchSchema = z.object({
  status: z.enum(["open", "snoozed", "resolved"]).optional(),
  assigneeMemberId: z.string().nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
  subject: z.string().optional(),
});

// PATCH /api/conversations/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const body = await req.json();
    const data = patchSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, workspaceId: session.workspaceId },
    });
    if (!conversation) return apiError("Conversation not found", 404);

    const updateData: Record<string, unknown> = { ...data.data };
    if (data.data.status === "resolved" && !conversation.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (data.data.status === "open") {
      updateData.resolvedAt = null;
    }

    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: true,
        assignee: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });

    // Notify assignee if changed
    if (data.data.assigneeMemberId && data.data.assigneeMemberId !== conversation.assigneeMemberId) {
      const assignee = await prisma.workspaceMember.findUnique({
        where: { id: data.data.assigneeMemberId },
      });
      if (assignee) {
        await prisma.notification.create({
          data: {
            workspaceId: session.workspaceId,
            userId: assignee.userId,
            type: "assignment",
            message: `You've been assigned a conversation`,
            link: `/inbox/${params.id}`,
          },
        });
      }
    }

    await broadcastToWorkspace(session.workspaceId, PUSHER_EVENTS.CONVERSATION_UPDATED, {
      conversation: updated,
    });

    return apiSuccess({ conversation: updated });
  } catch (err) {
    console.error("[conversation:patch]", err);
    return apiError("Internal server error", 500);
  }
}

const messageSchema = z.object({
  bodyText: z.string().min(1).max(10000),
  bodyHtml: z.string().optional(),
  channel: z.enum(["chat", "email", "internal_note"]).optional(),
});

// POST /api/conversations/:id/messages
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const body = await req.json();
    const data = messageSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, workspaceId: session.workspaceId },
      include: { contact: true },
    });
    if (!conversation) return apiError("Conversation not found", 404);

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    const workspace = await prisma.workspace.findUnique({
      where: { id: session.workspaceId },
    });

    const messageId = `<${Date.now()}.${session.userId}@superprofile.app>`;

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        workspaceId: session.workspaceId,
        senderType: "agent",
        senderUserId: session.userId,
        bodyText: data.data.bodyText,
        bodyHtml: data.data.bodyHtml || `<p>${data.data.bodyText}</p>`,
        channel: data.data.channel || conversation.channel,
        direction: "outbound",
        emailMessageId: messageId,
        deliveryStatus: "sent",
      },
      include: {
        senderUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: params.id },
      data: {
        lastMessageAt: new Date(),
        status: "open",
        firstResponseAt: conversation.firstResponseAt || new Date(),
      },
    });

    // Send outbound email if email channel
    if (
      conversation.channel === "email" &&
      data.data.channel !== "internal_note" &&
      conversation.contact.email
    ) {
      try {
        const lastInbound = await prisma.message.findFirst({
          where: {
            conversationId: params.id,
            direction: "inbound",
            emailMessageId: { not: null },
          },
          orderBy: { createdAt: "desc" },
        });

        await sendSupportReply({
          to: conversation.contact.email,
          subject: conversation.subject || "Support reply",
          bodyHtml: message.bodyHtml || message.bodyText,
          bodyText: message.bodyText,
          messageId,
          inReplyTo: lastInbound?.emailMessageId || undefined,
          references: lastInbound?.emailMessageId || undefined,
          fromName: workspace?.name || "Support",
          replyTo: workspace?.supportEmail || process.env.FROM_EMAIL || "",
        });

        await prisma.message.update({
          where: { id: message.id },
          data: { deliveryStatus: "delivered" },
        });
      } catch (emailErr) {
        console.error("[email:outbound]", emailErr);
        await prisma.message.update({
          where: { id: message.id },
          data: { deliveryStatus: "failed" },
        });
      }
    }

    // Broadcast to real-time
    await Promise.all([
      broadcastToConversation(params.id, PUSHER_EVENTS.NEW_MESSAGE, { message }),
      broadcastToWorkspace(session.workspaceId, PUSHER_EVENTS.NEW_MESSAGE, {
        conversationId: params.id,
        message,
      }),
    ]);

    // Broadcast to widget if chat
    const chatSession = await prisma.chatSession.findFirst({
      where: { conversationId: params.id },
    });
    if (chatSession) {
      await broadcastToWidget(chatSession.visitorToken, PUSHER_EVENTS.NEW_MESSAGE, { message });
    }

    return apiSuccess({ message }, 201);
  } catch (err) {
    console.error("[conversation:message]", err);
    return apiError("Internal server error", 500);
  }
}
