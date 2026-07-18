import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { inviteSchema } from "@/features/team/validation";
import { listMembers, inviteMember } from "@/features/team/service";

// GET /api/team/members
export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    return apiSuccess(await listMembers(session.workspaceId));
  } catch (err) {
    return handleApiError(err, "team:members:list");
  }
}

// POST /api/team/members (invite)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const data = inviteSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    return apiSuccess(await inviteMember(session, data.data), 201);
  } catch (err) {
    return handleApiError(err, "invite");
  }
}
