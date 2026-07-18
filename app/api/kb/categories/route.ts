import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { categorySchema } from "@/features/kb/validation";
import { listCategories, createCategory } from "@/features/kb/service";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    return apiSuccess(await listCategories(session.workspaceId));
  } catch (err) {
    return handleApiError(err, "kb:categories:list");
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const data = categorySchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await createCategory(session.workspaceId, data.data), 201);
  } catch (err) {
    return handleApiError(err, "kb:categories:post");
  }
}
