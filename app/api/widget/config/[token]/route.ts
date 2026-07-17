import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/http";
import { getWidgetConfig } from "@/features/widget/service";

// GET /api/widget/config/:token
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    return apiSuccess(await getWidgetConfig(params.token));
  } catch (err) {
    return handleApiError(err, "widget:config");
  }
}
