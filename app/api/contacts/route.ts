import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { listContacts } from "@/features/contacts/service";

// GET /api/contacts?search=...&source=...&page=1
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    return apiSuccess(
      await listContacts(session.workspaceId, {
        search: searchParams.get("search") || "",
        source: searchParams.get("source") || "",
        page: Math.max(1, parseInt(searchParams.get("page") || "1")),
        limit: Math.min(parseInt(searchParams.get("limit") || "40"), 100),
      })
    );
  } catch (err) {
    return handleApiError(err, "contacts:list");
  }
}
