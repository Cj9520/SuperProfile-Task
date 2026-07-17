import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { typingSchema } from "@/features/widget/validation";
import { setTyping } from "@/features/widget/service";

export async function POST(req: NextRequest) {
  try {
    const data = typingSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await setTyping(data.data));
  } catch (err) {
    return handleApiError(err, "widget:typing");
  }
}
