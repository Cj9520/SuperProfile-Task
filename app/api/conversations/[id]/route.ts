import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import {
  updateConversationSchema,
  messageSchema,
} from "@/features/conversations/validation";
import {
  getConversation,
  updateConversation,
  postMessage,
} from "@/features/conversations/service";

// GET /api/conversations/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    return apiSuccess(await getConversation(session.workspaceId, params.id));
  } catch (err) {
    return handleApiError(err, "conversation:get");
  }
}

// PATCH /api/conversations/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = updateConversationSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await updateConversation(session, params.id, data.data));
  } catch (err) {
    return handleApiError(err, "conversation:patch");
  }
}

// POST /api/conversations/:id/messages — agent reply or internal note
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const data = messageSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await postMessage(session, params.id, data.data), 201);
  } catch (err) {
    return handleApiError(err, "conversation:message");
  }
}
