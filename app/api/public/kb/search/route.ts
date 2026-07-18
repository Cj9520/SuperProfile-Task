import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { publicSearch } from "@/features/kb/service";

const searchQuerySchema = z.object({
  q: z.string().max(200).default(""),
  workspaceId: z.string().max(64).nullable(),
  token: z.string().max(64).nullable(),
});

// GET /api/public/kb/search?q=...&workspaceId=...&token=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get("q") || undefined,
      workspaceId: searchParams.get("workspaceId"),
      token: searchParams.get("token"),
    });
    if (!parsed.success) return apiValidationError(parsed.error);

    return apiSuccess(await publicSearch(parsed.data));
  } catch (err) {
    return handleApiError(err, "kb:public:search");
  }
}
