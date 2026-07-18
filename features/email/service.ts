import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { broadcastToWorkspace, PUSHER_EVENTS } from "@/lib/pusher";

// SMTP_USER/SMTP_PASS with EMAIL_ID/EMAIL_PASS as accepted aliases;
// host defaults to Gmail since that's the expected provider.
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_ID;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS;
// A leftover Resend sender can't be used through Gmail — fall back to the
// authenticated address (Gmail rewrites mismatched From headers anyway).
const FROM_EMAIL =
  process.env.FROM_EMAIL && !process.env.FROM_EMAIL.endsWith("@resend.dev")
    ? process.env.FROM_EMAIL
    : SMTP_USER || "";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Lazily instantiate the SMTP transport so `next build` (where SMTP env vars
// may be absent) never fails at module load — same pattern as before.
let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error(
        "SMTP is not configured — set SMTP_USER/SMTP_PASS (or EMAIL_ID/EMAIL_PASS)."
      );
    }
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465, // TLS from the start on 465; STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// ─── Signup email verification ────────────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await getTransporter().sendMail({
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
           style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;
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

  await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${workspaceName} on SuperProfile`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #0b0b0d; padding: 32px; border-radius: 16px; margin-bottom: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">SuperProfile</h1>
          <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 14px;">Customer Communication Platform</p>
        </div>
        
        <h2 style="color: #18181b; font-size: 22px;">You've been invited! 🎉</h2>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on SuperProfile.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${acceptUrl}" style="background: #fbbf24; color: #18181b; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
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
  await getTransporter().sendMail({
    from: `${fromName} <${FROM_EMAIL}>`,
    to,
    replyTo,
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    html: bodyHtml,
    text: bodyText,
    messageId,
    inReplyTo: inReplyTo || undefined,
    references: references || undefined,
    headers: { "X-SuperProfile": "true" },
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
  await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #18181b;">${subject}</h2>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">${message}</p>
        ${ctaUrl ? `<div style="text-align: center; margin: 32px 0;"><a href="${ctaUrl}" style="background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${ctaText || "View"}</a></div>` : ""}
        <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px;">SuperProfile</p>
        </div>
      </div>
    `,
  });
}
