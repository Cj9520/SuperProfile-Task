import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { getReports } from "@/features/reports/service";

// GET /api/reports?period=7d|30d|90d
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const parsed = z
    .enum(["7d", "30d", "90d"])
    .safeParse(new URL(req.url).searchParams.get("period") || "30d");
  if (!parsed.success) {
    return apiError("Invalid period. Expected one of: 7d, 30d, 90d.", 422);
  }

  try {
    return apiSuccess(await getReports(session.workspaceId, parsed.data));
  } catch (err) {
    return handleApiError(err, "reports");
  }
}
