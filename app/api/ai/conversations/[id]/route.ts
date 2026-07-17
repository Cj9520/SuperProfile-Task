import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { summarizeConversation, getSummary } from "@/features/ai/service";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/ai/conversations/:id/summarize
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const { id } = await params;
    return apiSuccess(await summarizeConversation(session, id));
  } catch (err) {
    return handleApiError(err, "ai:summarize");
  }
}

// GET /api/ai/conversations/:id/summary
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const { id } = await params;
    return apiSuccess(await getSummary(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "ai:summary:get");
  }
}
