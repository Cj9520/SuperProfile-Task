import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { conversationFiltersSchema } from "@/features/conversations/validation";
import { listConversations } from "@/features/conversations/service";

// GET /api/conversations
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    const filters = conversationFiltersSchema.safeParse({
      status: searchParams.get("status") || undefined,
      channel: searchParams.get("channel") || undefined,
      assigneeId: searchParams.get("assigneeId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (!filters.success) return apiValidationError(filters.error);

    return apiSuccess(await listConversations(session.workspaceId, filters.data));
  } catch (err) {
    return handleApiError(err, "conversations:list");
  }
}
