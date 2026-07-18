import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import {
  broadcastToConversation,
  broadcastToWorkspace,
  PUSHER_EVENTS,
} from "@/lib/pusher";
import type {
  SessionInput,
  WidgetMessageInput,
  TypingInput,
} from "@/features/widget/validation";

/** Create a new visitor session (contact + conversation + chat session) or recover an existing one. */
export async function createOrRecoverSession(input: SessionInput) {
  const workspace = await prisma.workspace.findUnique({
    where: { widgetToken: input.widgetToken },
  });
  if (!workspace) throw new ApiError(404, "Invalid widget token");

  // Recover an existing session for this workspace.
  if (input.visitorToken) {
    const existing = await prisma.chatSession.findUnique({
      where: { visitorToken: input.visitorToken },
      include: { conversation: true },
    });
    if (existing && existing.workspaceId === workspace.id) {
      await prisma.chatSession.update({
        where: { id: existing.id },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
          currentPageUrl: input.currentPageUrl,
        },
      });
      return { data: { session: existing, isNew: false }, status: 200 };
    }
  }

  const visitorToken =
    input.visitorToken || `vt_${randomUUID().replace(/-/g, "")}`;

  let contact = input.visitorEmail
    ? await prisma.contact.findFirst({
        where: { workspaceId: workspace.id, email: input.visitorEmail },
      })
    : null;

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        email: input.visitorEmail,
        name: input.visitorName,
        source: "chat",
        lastSeenAt: new Date(),
      },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      contactId: contact.id,
      channel: "chat",
      subject: `Chat from ${input.visitorName || "Visitor"}`,
      status: "open",
      lastMessageAt: new Date(),
    },
  });

  const session = await prisma.chatSession.create({
    data: {
      workspaceId: workspace.id,
      conversationId: conversation.id,
      visitorToken,
      visitorName: input.visitorName,
      visitorEmail: input.visitorEmail,
      currentPageUrl: input.currentPageUrl,
      userAgent: input.userAgent,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });

  return { data: { session, conversation, isNew: true }, status: 201 };
}

export async function postWidgetMessage(input: WidgetMessageInput) {
  const chatSession = await prisma.chatSession.findUnique({
    where: { visitorToken: input.visitorToken },
    include: { conversation: true },
  });
  if (!chatSession || !chatSession.conversationId) {
    throw new ApiError(404, "Session not found");
  }

  const message = await prisma.message.create({
    data: {
      conversationId: chatSession.conversationId,
      workspaceId: chatSession.workspaceId,
      senderType: "customer",
      bodyText: input.bodyText,
      bodyHtml: `<p>${input.bodyText}</p>`,
      channel: "chat",
      direction: "inbound",
      deliveryStatus: "received",
    },
  });

  await prisma.conversation.update({
    where: { id: chatSession.conversationId },
    data: { lastMessageAt: new Date(), status: "open" },
  });

  await Promise.all([
    broadcastToConversation(chatSession.conversationId, PUSHER_EVENTS.NEW_MESSAGE, {
      message,
    }),
    broadcastToWorkspace(chatSession.workspaceId, PUSHER_EVENTS.NEW_MESSAGE, {
      conversationId: chatSession.conversationId,
      message,
    }),
  ]);

  return { message };
}

export async function getWidgetMessages(visitorToken: string) {
  const chatSession = await prisma.chatSession.findUnique({
    where: { visitorToken },
  });
  if (!chatSession || !chatSession.conversationId) {
    return { messages: [] };
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId: chatSession.conversationId,
      channel: { not: "internal_note" },
    },
    orderBy: { createdAt: "asc" },
    include: { senderUser: { select: { name: true, avatarUrl: true } } },
  });

  return { messages, conversationId: chatSession.conversationId };
}

export async function getWidgetConfig(token: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { widgetToken: token },
    select: { id: true, name: true, widgetToken: true },
  });
  if (!workspace) throw new ApiError(404, "Invalid widget token");

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      widgetToken: workspace.widgetToken,
    },
    pusherKey: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || "",
    pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
  };
}

/** Heuristic agent presence: any accepted member who logged in within 8h. */
export async function getWidgetStatus(token: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { widgetToken: token },
    include: {
      members: {
        where: { inviteStatus: "accepted" },
        include: { user: { select: { lastLoginAt: true } } },
        take: 10,
      },
    },
  });
  if (!workspace) throw new ApiError(404, "Workspace not found");

  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const isOnline = workspace.members.some(
    (m) => m.user.lastLoginAt && m.user.lastLoginAt > eightHoursAgo
  );

  return {
    isOnline,
    responseTime: isOnline
      ? "Typically replies in a few minutes"
      : "We'll reply as soon as possible",
  };
}

export async function setTyping(input: TypingInput) {
  const chatSession = await prisma.chatSession.findUnique({
    where: { visitorToken: input.visitorToken },
  });
  if (!chatSession || !chatSession.conversationId) {
    throw new ApiError(404, "Session not found");
  }

  const event = input.isTyping
    ? PUSHER_EVENTS.TYPING_START
    : PUSHER_EVENTS.TYPING_STOP;

  await Promise.all([
    broadcastToConversation(chatSession.conversationId, event, {
      source: "customer",
      visitorToken: input.visitorToken,
    }),
    broadcastToWorkspace(chatSession.workspaceId, event, {
      conversationId: chatSession.conversationId,
      source: "customer",
    }),
  ]);

  return { ok: true };
}
