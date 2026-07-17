import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { broadcastToWorkspace, PUSHER_EVENTS } from "@/lib/pusher";

const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Lazily instantiate the Resend client. Constructing it at module load throws
// when RESEND_API_KEY is unset (e.g. during `next build` page-data collection),
// so defer it until an email is actually sent.
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// ─── Signup email verification ────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your email — SuperProfile",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
        <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;">Welcome to SuperProfile 👋</h1>
        <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">
          Click the button below to verify your email address and activate your account.
          This link will expire in <strong>24 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#d1d5db;font-size:12px;margin:0;">
          ${link}
        </p>
      </div>
    `,
  });
}

// ─── Invite email ──────────────────────────────────────────────────────────────

export async function sendInviteEmail({
  to,
  workspaceName,
  inviterName,
  inviteToken,
}: {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteToken: string;
}) {
  const acceptUrl = `${APP_URL}/invite/accept?token=${inviteToken}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${workspaceName} on SuperProfile`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px; border-radius: 16px; margin-bottom: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">SuperProfile</h1>
          <p style="color: #c7d2fe; margin: 8px 0 0; font-size: 14px;">Customer Communication Platform</p>
        </div>
        
        <h2 style="color: #1e1b4b; font-size: 22px;">You've been invited! 🎉</h2>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on SuperProfile.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 14px; text-align: center;">
          This invitation expires in 72 hours. If you didn't expect this email, you can safely ignore it.
        </p>
        
        <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;">SuperProfile • Customer Communication Platform</p>
        </div>
      </div>
    `,
  });
}

// ─── Outbound support email ────────────────────────────────────────────────────

export async function sendSupportReply({
  to,
  subject,
  bodyHtml,
  bodyText,
  messageId,
  inReplyTo,
  references,
  fromName,
  replyTo,
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  fromName: string;
  replyTo: string;
}) {
  const headers: Record<string, string> = {
    "Message-ID": messageId,
    "X-SuperProfile": "true",
  };

  if (inReplyTo) headers["In-Reply-To"] = inReplyTo;
  if (references) headers["References"] = references;

  await getResend().emails.send({
    from: `${fromName} <${FROM_EMAIL}>`,
    to,
    replyTo,
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    html: bodyHtml,
    text: bodyText,
    headers,
  });
}

// ─── Inbound email processing ───────────────────────────────────────────────

// Normalizes the field variants used by Resend / Mailgun / Postmark webhooks.
function parseInboundPayload(body: Record<string, any>) {
  const from = body.from || body.sender || body.headers?.from || "";
  const to = body.to || body.recipient || body.headers?.to || "";
  const subject = body.subject || body.headers?.subject || "(no subject)";
  const bodyText = body.text || body.body_plain || body["body-plain"] || "";
  const bodyHtml = body.html || body.body_html || body["body-html"] || bodyText;
  const messageId =
    body["message-id"] ||
    body.headers?.["message-id"] ||
    `<inbound-${Date.now()}@superprofile.app>`;
  const inReplyTo =
    body["in-reply-to"] || body.headers?.["in-reply-to"] || null;

  return { from, to, subject, bodyText, bodyHtml, messageId, inReplyTo };
}

/**
 * Handle a parsed inbound email webhook: resolve the workspace by support
 * address, upsert the contact, thread by Message-ID/In-Reply-To (falling back
 * to normalized subject + contact), persist the message, and notify agents.
 * Returns `null` when no workspace matches the recipient (a no-op success).
 */
export async function processInboundEmail(body: Record<string, any>) {
  const { from, to, subject, bodyText, bodyHtml, messageId, inReplyTo } =
    parseInboundPayload(body);

  if (!from || !to) {
    throw new ApiError(422, "Invalid inbound email payload");
  }

  const senderEmail = from.match(/<(.+)>/)?.[1] || from.trim();
  const senderName =
    from.match(/^([^<]+)</)?.[1]?.trim() || senderEmail.split("@")[0];
  const recipientEmail = to.match(/<(.+)>/)?.[1] || to.trim();

  const workspace = await prisma.workspace.findFirst({
    where: { supportEmail: recipientEmail },
  });
  if (!workspace) {
    console.warn("[email:inbound] No workspace for recipient:", recipientEmail);
    return null;
  }

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

  // Thread: primary match on In-Reply-To → existing message id.
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

  // Fallback: normalized subject + contact on an unresolved thread.
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

  await broadcastToWorkspace(workspace.id, PUSHER_EVENTS.NEW_MESSAGE, {
    conversationId: conversation.id,
    message,
  });

  return { conversationId: conversation.id };
}

// ─── Notification email ───────────────────────────────────────────────────────

export async function sendNotificationEmail({
  to,
  subject,
  message,
  ctaUrl,
  ctaText,
}: {
  to: string;
  subject: string;
  message: string;
  ctaUrl?: string;
  ctaText?: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1e1b4b;">${subject}</h2>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">${message}</p>
        ${ctaUrl ? `<div style="text-align: center; margin: 32px 0;"><a href="${ctaUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${ctaText || "View"}</a></div>` : ""}
        <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;">SuperProfile</p>
        </div>
      </div>
    `,
  });
}
