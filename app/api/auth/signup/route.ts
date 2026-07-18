import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signupSchema } from "@/features/auth/validation";
import { signup } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per 15 min
  const ip = getClientIp(req);
  if (!checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  try {
    const data = signupSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await signup(data.data), 201);
  } catch (err) {
    return handleApiError(err, "signup");
  }
}
