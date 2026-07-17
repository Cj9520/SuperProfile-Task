import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { verifyDomain, removeDomain } from "@/features/domains/service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    return apiSuccess(await removeDomain(session.workspaceId, params.id));
  } catch (err) {
    return handleApiError(err, "domains:delete");
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    return apiSuccess(await verifyDomain(session.workspaceId, params.id));
  } catch (err) {
    return handleApiError(err, "domains:verify");
  }
}
