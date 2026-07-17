import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/features/auth/validation";
import { login } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 min
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const data = loginSchema.safeParse(await req.json());
    if (!data.success) return apiError("Invalid email or password", 422);

    return apiSuccess(await login(data.data));
  } catch (err) {
    return handleApiError(err, "login");
  }
}
