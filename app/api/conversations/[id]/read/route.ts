import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { markConversationRead } from "@/features/conversations/service";

// POST /api/conversations/:id/read — mark all inbound messages as read
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const { id } = await params;
    return apiSuccess(await markConversationRead(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "conversation:read");
  }
}
