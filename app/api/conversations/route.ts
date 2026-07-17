import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { listConversations } from "@/features/conversations/service";

// GET /api/conversations
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    return apiSuccess(
      await listConversations(session.workspaceId, {
        status: searchParams.get("status") || undefined,
        channel: searchParams.get("channel") || undefined,
        assigneeId: searchParams.get("assigneeId") || undefined,
        search: searchParams.get("search") || undefined,
        page: parseInt(searchParams.get("page") || "1"),
        limit: Math.min(parseInt(searchParams.get("limit") || "30"), 100),
      })
    );
  } catch (err) {
    return handleApiError(err, "conversations:list");
  }
}
