import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
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
