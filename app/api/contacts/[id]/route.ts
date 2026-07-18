import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { getContactDetail } from "@/features/contacts/service";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const { id } = await params;
    return apiSuccess(await getContactDetail(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "contacts:get");
  }
}
