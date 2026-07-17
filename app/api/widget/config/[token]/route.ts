import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/http";
import { getWidgetConfig } from "@/features/widget/service";

// GET /api/widget/config/:token
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    return apiSuccess(await getWidgetConfig(token));
  } catch (err) {
    return handleApiError(err, "widget:config");
  }
}
