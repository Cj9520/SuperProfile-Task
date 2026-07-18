import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { domainSchema } from "@/features/domains/validation";
import { listDomains, addDomain } from "@/features/domains/service";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    return apiSuccess(await listDomains(session.workspaceId));
  } catch (err) {
    return handleApiError(err, "domains:list");
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const data = domainSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await addDomain(session.workspaceId, data.data), 201);
  } catch (err) {
    return handleApiError(err, "domains:post");
  }
}
