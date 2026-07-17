import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { updateArticleSchema } from "@/features/kb/validation";
import { updateArticle, deleteArticle } from "@/features/kb/service";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = updateArticleSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const { id } = await params;
    return apiSuccess(await updateArticle(session.workspaceId, id, data.data));
  } catch (err) {
    return handleApiError(err, "kb:article:patch");
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const { id } = await params;
    return apiSuccess(await deleteArticle(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "kb:article:delete");
  }
}
