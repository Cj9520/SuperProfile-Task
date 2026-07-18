import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { processInboundEmail } from "@/features/email/service";

// Loose shape check — providers (Resend/Mailgun/Postmark) differ in field
// names, so field normalization happens in the service. This only guarantees
// the payload is an object whose known fields are strings.
const inboundSchema = z
  .object({
    from: z.string().optional(),
    sender: z.string().optional(),
    to: z.string().optional(),
    recipient: z.string().optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    html: z.string().optional(),
    headers: z.record(z.unknown()).optional(),
  })
  .passthrough();

// POST /api/email/inbound
// Supports Resend/Mailgun/Postmark webhook formats.
export async function POST(req: NextRequest) {
  try {
    // The webhook is unusable without a shared secret — refuse to run open.
    if (!process.env.INBOUND_EMAIL_SECRET) {
      console.error("[email:inbound] INBOUND_EMAIL_SECRET is not configured");
      return apiError("Inbound email is not configured", 503);
    }
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.INBOUND_EMAIL_SECRET) {
      return apiError("Invalid webhook signature", 401);
    }

    const parsed = inboundSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiError("Invalid inbound email payload", 422);
    }

    const result = await processInboundEmail(parsed.data);
    if (!result) {
      return apiSuccess({ message: "No workspace found for recipient" });
    }

    return apiSuccess({
      message: "Email processed",
      conversationId: result.conversationId,
    });
  } catch (err) {
    return handleApiError(err, "email:inbound");
  }
}
