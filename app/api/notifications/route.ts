import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { listNotifications, markAllRead } from "@/features/notifications/service";

// GET /api/notifications — list recent notifications for current user
export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    return apiSuccess(
      await listNotifications(session.userId, session.workspaceId)
    );
  } catch (err) {
    return handleApiError(err, "notifications:list");
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    return apiSuccess(await markAllRead(session.userId, session.workspaceId));
  } catch (err) {
    return handleApiError(err, "notifications:markAllRead");
  }
}
