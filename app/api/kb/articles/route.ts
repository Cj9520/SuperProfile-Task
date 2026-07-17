import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { articleSchema } from "@/features/kb/validation";
import { listArticles, createArticle } from "@/features/kb/service";

// GET /api/kb/articles?status=published&categoryId=...
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    return apiSuccess(
      await listArticles(session.workspaceId, {
        status: searchParams.get("status") || undefined,
        categoryId: searchParams.get("categoryId") || undefined,
      })
    );
  } catch (err) {
    return handleApiError(err, "kb:articles:list");
  }
}

// POST /api/kb/articles
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = articleSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await createArticle(session, data.data), 201);
  } catch (err) {
    return handleApiError(err, "kb:articles:post");
  }
}
