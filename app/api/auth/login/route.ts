import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/features/auth/validation";
import { login } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 min
  const ip = getClientIp(req);
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const data = loginSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await login(data.data));
  } catch (err) {
    return handleApiError(err, "login");
  }
}
