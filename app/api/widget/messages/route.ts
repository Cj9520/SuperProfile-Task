import { NextRequest } from "next/server";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { widgetMessageSchema } from "@/features/widget/validation";
import { postWidgetMessage, getWidgetMessages } from "@/features/widget/service";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`widget-msg:${ip}`, 20, 60 * 1000)) {
    return apiError("Too many messages. Slow down.", 429);
  }

  try {
    const data = widgetMessageSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await postWidgetMessage(data.data), 201);
  } catch (err) {
    return handleApiError(err, "widget:messages");
  }
}

// GET /api/widget/messages?visitorToken=...
export async function GET(req: NextRequest) {
  const visitorToken = new URL(req.url).searchParams.get("visitorToken");
  if (!visitorToken) return apiError("visitorToken required", 400);

  try {
    return apiSuccess(await getWidgetMessages(visitorToken));
  } catch (err) {
    return handleApiError(err, "widget:messages:get");
  }
}
