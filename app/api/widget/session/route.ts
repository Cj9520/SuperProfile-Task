import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sessionSchema } from "@/features/widget/validation";
import { createOrRecoverSession } from "@/features/widget/service";

export async function POST(req: NextRequest) {
  // Rate limit: 20 session creations per IP per minute.
  if (!checkRateLimit(`widget:session:${getClientIp(req)}`, 20, 60 * 1000)) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  try {
    const data = sessionSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    const { data: payload, status } = await createOrRecoverSession(data.data);
    return apiSuccess(payload, status);
  } catch (err) {
    return handleApiError(err, "widget:session");
  }
}
