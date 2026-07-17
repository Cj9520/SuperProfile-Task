import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { getReports } from "@/features/reports/service";

// GET /api/reports?period=7d|30d|90d
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const period = new URL(req.url).searchParams.get("period") || "30d";
  try {
    return apiSuccess(await getReports(session.workspaceId, period));
  } catch (err) {
    return handleApiError(err, "reports");
  }
}
