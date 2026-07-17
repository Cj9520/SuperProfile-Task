import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { updateMemberSchema } from "@/features/team/validation";
import { updateMember, removeMember } from "@/features/team/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const data = updateMemberSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(
      await updateMember(session.workspaceId, params.id, data.data)
    );
  } catch (err) {
    return handleApiError(err, "team:patch");
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
    return apiSuccess(await removeMember(session.workspaceId, params.id));
  } catch (err) {
    return handleApiError(err, "team:delete");
  }
}
