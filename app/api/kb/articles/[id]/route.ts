import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { updateArticleSchema } from "@/features/kb/validation";
import { updateArticle, deleteArticle } from "@/features/kb/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = updateArticleSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await updateArticle(session.workspaceId, params.id, data.data));
  } catch (err) {
    return handleApiError(err, "kb:article:patch");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    return apiSuccess(await deleteArticle(session.workspaceId, params.id));
  } catch (err) {
    return handleApiError(err, "kb:article:delete");
  }
}
