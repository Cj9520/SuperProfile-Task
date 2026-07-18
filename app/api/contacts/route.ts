import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { listContacts } from "@/features/contacts/service";

const contactFiltersSchema = z.object({
  search: z.string().max(200).default(""),
  source: z.string().max(50).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

// GET /api/contacts?search=...&source=...&page=1
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    const filters = contactFiltersSchema.safeParse({
      search: searchParams.get("search") || undefined,
      source: searchParams.get("source") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (!filters.success) return apiValidationError(filters.error);

    return apiSuccess(await listContacts(session.workspaceId, filters.data));
  } catch (err) {
    return handleApiError(err, "contacts:list");
  }
}
