import { NextRequest } from "next/server";
import { apiSuccess, handleApiError } from "@/lib/http";
import { publicSearch } from "@/features/kb/service";

// GET /api/public/kb/search?q=...&workspaceId=...&token=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    return apiSuccess(
      await publicSearch({
        q: searchParams.get("q") || "",
        workspaceId: searchParams.get("workspaceId"),
        token: searchParams.get("token"),
      })
    );
  } catch (err) {
    return handleApiError(err, "kb:public:search");
  }
}
