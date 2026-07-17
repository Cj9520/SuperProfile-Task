import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { processInboundEmail } from "@/features/email/service";

// POST /api/email/inbound
// Supports Resend/Mailgun/Postmark webhook formats.
export async function POST(req: NextRequest) {
  try {
    // Validate provider signature (simplified — add HMAC in production).
    const secret = req.headers.get("x-webhook-secret");
    if (
      process.env.INBOUND_EMAIL_SECRET &&
      secret !== process.env.INBOUND_EMAIL_SECRET
    ) {
      return apiError("Invalid webhook signature", 401);
    }

    const result = await processInboundEmail(await req.json());
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
