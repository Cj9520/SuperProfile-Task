import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { getWidgetStatus } from "@/features/widget/service";

// GET /api/widget/status?token=... — returns whether any agent is online
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return apiError("token required", 400);

  try {
    return apiSuccess(await getWidgetStatus(token));
  } catch (err) {
    return handleApiError(err, "widget:status");
  }
}
