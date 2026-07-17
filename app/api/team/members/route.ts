import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { inviteSchema } from "@/features/team/validation";
import { listMembers, inviteMember } from "@/features/team/service";

// GET /api/team/members
export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  return apiSuccess(await listMembers(session.workspaceId));
}

// POST /api/team/members (invite)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const data = inviteSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await inviteMember(session, data.data), 201);
  } catch (err) {
    return handleApiError(err, "invite");
  }
}
