import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/features/auth/validation";
import { signup } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per 15 min
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  try {
    const data = signupSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await signup(data.data), 201);
  } catch (err) {
    return handleApiError(err, "signup");
  }
}
