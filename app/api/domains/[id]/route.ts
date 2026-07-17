import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { verifyDomain, removeDomain } from "@/features/domains/service";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const { id } = await params;
    return apiSuccess(await removeDomain(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "domains:delete");
  }
}

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const { id } = await params;
    return apiSuccess(await verifyDomain(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "domains:verify");
  }
}
