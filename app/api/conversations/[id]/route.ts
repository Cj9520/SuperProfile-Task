import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import {
  updateConversationSchema,
  messageSchema,
} from "@/features/conversations/validation";
import {
  getConversation,
  updateConversation,
  postMessage,
} from "@/features/conversations/service";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/conversations/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const { id } = await params;
    return apiSuccess(await getConversation(session.workspaceId, id));
  } catch (err) {
    return handleApiError(err, "conversation:get");
  }
}

// PATCH /api/conversations/:id
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = updateConversationSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    const { id } = await params;
    return apiSuccess(await updateConversation(session, id, data.data));
  } catch (err) {
    return handleApiError(err, "conversation:patch");
  }
}

// POST /api/conversations/:id/messages — agent reply or internal note
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = messageSchema.safeParse(await req.json());
    if (!data.success) return apiValidationError(data.error);

    const { id } = await params;
    return apiSuccess(await postMessage(session, id, data.data), 201);
  } catch (err) {
    return handleApiError(err, "conversation:message");
  }
}
