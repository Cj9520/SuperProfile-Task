import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import type { SessionPayload } from "@/lib/auth";
import {
  broadcastToWorkspace,
  broadcastToConversation,
  broadcastToWidget,
  PUSHER_EVENTS,
} from "@/lib/pusher";
import { sendSupportReply } from "@/features/email/service";
import type {
  ConversationFilters,
  UpdateConversationInput,
  MessageInput,
} from "@/features/conversations/validation";

export async function listConversations(
  workspaceId: string,
  filters: ConversationFilters
) {
  const { status, channel, assigneeId, search, page, limit } = filters;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { workspaceId };
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (assigneeId === "unassigned") {
    where.assigneeMemberId = null;
  } else if (assigneeId) {
    where.assigneeMemberId = assigneeId;
  }
  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { contact: { name: { contains: search } } },
      { contact: { email: { contains: search } } },
    ];
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignee: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { bodyText: true, createdAt: true, senderType: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ]);

  return { conversations, total, page, limit };
}

export async function getConversation(workspaceId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId },
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

  if (!conversation) throw new ApiError(404, "Conversation not found");
  return { conversation };
}

export async function updateConversation(
  session: SessionPayload,
  id: string,
  input: UpdateConversationInput
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: session.workspaceId },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const updateData: Record<string, unknown> = { ...input };
  if (input.status === "resolved" && !conversation.resolvedAt) {
    updateData.resolvedAt = new Date();
  }
  if (input.status === "open") {
    updateData.resolvedAt = null;
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: updateData,
    include: {
      contact: true,
      assignee: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  // Notify assignee if changed.
  if (
    input.assigneeMemberId &&
    input.assigneeMemberId !== conversation.assigneeMemberId
  ) {
    const assignee = await prisma.workspaceMember.findUnique({
      where: { id: input.assigneeMemberId },
    });
    if (assignee) {
      await prisma.notification.create({
        data: {
          workspaceId: session.workspaceId,
          userId: assignee.userId,
          type: "assignment",
          message: `You've been assigned a conversation`,
          link: `/inbox/${id}`,
        },
      });
    }
  }

  await broadcastToWorkspace(
    session.workspaceId,
    PUSHER_EVENTS.CONVERSATION_UPDATED,
    { conversation: updated }
  );

  return { conversation: updated };
}

export async function postMessage(
  session: SessionPayload,
  id: string,
  input: MessageInput
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: session.workspaceId },
    include: { contact: true },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
  });

  const messageId = `<${Date.now()}.${session.userId}@superprofile.app>`;

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      workspaceId: session.workspaceId,
      senderType: "agent",
      senderUserId: session.userId,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml || `<p>${input.bodyText}</p>`,
      channel: input.channel || conversation.channel,
      direction: "outbound",
      emailMessageId: messageId,
      deliveryStatus: "sent",
    },
    include: {
      senderUser: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: {
      lastMessageAt: new Date(),
      status: "open",
      firstResponseAt: conversation.firstResponseAt || new Date(),
    },
  });

  // Send outbound email if this is an email conversation (not an internal note).
  if (
    conversation.channel === "email" &&
    input.channel !== "internal_note" &&
    conversation.contact.email
  ) {
    try {
      const lastInbound = await prisma.message.findFirst({
        where: {
          conversationId: id,
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

  await Promise.all([
    broadcastToConversation(id, PUSHER_EVENTS.NEW_MESSAGE, { message }),
    broadcastToWorkspace(session.workspaceId, PUSHER_EVENTS.NEW_MESSAGE, {
      conversationId: id,
      message,
    }),
  ]);

  const chatSession = await prisma.chatSession.findFirst({
    where: { conversationId: id },
  });
  if (chatSession) {
    await broadcastToWidget(chatSession.visitorToken, PUSHER_EVENTS.NEW_MESSAGE, {
      message,
    });
  }

  return { message };
}

/** Mark inbound (customer/system) messages read and push a widget read receipt. */
export async function markConversationRead(workspaceId: string, id: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId: id,
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

    const chatSession = await prisma.chatSession.findFirst({
      where: { conversationId: id },
    });
    if (chatSession) {
      await broadcastToWidget(chatSession.visitorToken, "message-read", {
        messageIds: unreadMessages.map((m) => m.id),
        readAt: new Date().toISOString(),
      });
    }
  }

  return { ok: true, readCount: unreadMessages.length };
}
