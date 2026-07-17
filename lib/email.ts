import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

  await resend.emails.send({
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

  await resend.emails.send({
    from: `${fromName} <${FROM_EMAIL}>`,
    to,
    replyTo,
    subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
    html: bodyHtml,
    text: bodyText,
    headers,
  });
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
  await resend.emails.send({
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
