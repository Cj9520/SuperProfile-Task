import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { acceptInviteSchema } from "@/features/auth/validation";
import { acceptInvite } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  // Rate limit: 5 attempts per IP per 15 min (invite tokens must not be
  // brute-forceable).
  if (!checkRateLimit(`invite:accept:${getClientIp(req)}`, 5, 15 * 60 * 1000)) {
    return apiError("Too many attempts. Please try again later.", 429);
  }

  try {
    const data = acceptInviteSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await acceptInvite(data.data));
  } catch (err) {
    return handleApiError(err, "invite:accept");
  }
}
