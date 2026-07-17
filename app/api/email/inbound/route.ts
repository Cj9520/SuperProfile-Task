import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";
import { broadcastToWorkspace, PUSHER_EVENTS } from "@/lib/pusher";

// POST /api/email/inbound
// Supports Resend/Mailgun/Postmark webhook format
export async function POST(req: NextRequest) {
  try {
    // Validate provider signature (simplified — add HMAC in production)
    const secret = req.headers.get("x-webhook-secret");
    if (
      process.env.INBOUND_EMAIL_SECRET &&
      secret !== process.env.INBOUND_EMAIL_SECRET
    ) {
      return apiError("Invalid webhook signature", 401);
    }

    const body = await req.json();

    // Support multiple provider formats
    const from =
      body.from || body.sender || body.headers?.from || "";
    const to =
      body.to ||
      body.recipient ||
      body.headers?.to ||
      "";
    const subject = body.subject || body.headers?.subject || "(no subject)";
    const bodyText = body.text || body.body_plain || body["body-plain"] || "";
    const bodyHtml = body.html || body.body_html || body["body-html"] || bodyText;
    const messageId =
      body["message-id"] ||
      body.headers?.["message-id"] ||
      `<inbound-${Date.now()}@superprofile.app>`;
    const inReplyTo =
      body["in-reply-to"] || body.headers?.["in-reply-to"] || null;

    if (!from || !to) {
      return apiError("Invalid inbound email payload", 422);
    }

    // Parse sender email
    const senderEmail = from.match(/<(.+)>/)?.[1] || from.trim();
    const senderName =
      from.match(/^([^<]+)</)?.[1]?.trim() || senderEmail.split("@")[0];

    // Find workspace by support email (to: field)
    const recipientEmail = to.match(/<(.+)>/)?.[1] || to.trim();
    const workspace = await prisma.workspace.findFirst({
      where: { supportEmail: recipientEmail },
    });

    if (!workspace) {
      console.warn("[email:inbound] No workspace for recipient:", recipientEmail);
      return apiSuccess({ message: "No workspace found for recipient" });
    }

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email: senderEmail },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: senderEmail,
          name: senderName,
          source: "email",
          lastSeenAt: new Date(),
        },
      });
    }

    // Try to find existing conversation by thread
    let conversation = null;

    if (inReplyTo) {
      const existingMessage = await prisma.message.findFirst({
        where: { emailMessageId: inReplyTo },
        include: { conversation: true },
      });
      if (existingMessage?.conversation.workspaceId === workspace.id) {
        conversation = existingMessage.conversation;
      }
    }

    // Fallback: match by subject + contact
    if (!conversation) {
      const normalized = subject.replace(/^Re:\s*/i, "").trim();
      conversation = await prisma.conversation.findFirst({
        where: {
          workspaceId: workspace.id,
          contactId: contact.id,
          channel: "email",
          subject: normalized,
          status: { not: "resolved" },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Create new conversation if needed
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          contactId: contact.id,
          channel: "email",
          subject,
          status: "open",
          lastMessageAt: new Date(),
          sourceThreadKey: messageId,
        },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        workspaceId: workspace.id,
        senderType: "customer",
        bodyText,
        bodyHtml,
        channel: "email",
        direction: "inbound",
        emailMessageId: messageId,
        emailInReplyTo: inReplyTo,
        deliveryStatus: "received",
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: "open" },
    });

    // Real-time broadcast to agents
    await broadcastToWorkspace(workspace.id, PUSHER_EVENTS.NEW_MESSAGE, {
      conversationId: conversation.id,
      message,
    });

    return apiSuccess({ message: "Email processed", conversationId: conversation.id });
  } catch (err) {
    console.error("[email:inbound]", err);
    return apiError("Internal server error", 500);
  }
}
