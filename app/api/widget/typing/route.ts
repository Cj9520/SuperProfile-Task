import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { typingSchema } from "@/features/widget/validation";
import { setTyping } from "@/features/widget/service";

export async function POST(req: NextRequest) {
  try {
    const data = typingSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await setTyping(data.data));
  } catch (err) {
    return handleApiError(err, "widget:typing");
  }
}
