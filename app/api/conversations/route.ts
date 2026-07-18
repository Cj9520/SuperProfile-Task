import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, handleApiError } from "@/lib/http";
import { conversationFiltersSchema } from "@/features/conversations/validation";
import { listConversations, createConversation } from "@/features/conversations/service";

// GET /api/conversations
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  try {
    const filters = conversationFiltersSchema.safeParse({
      status: searchParams.get("status") || undefined,
      channel: searchParams.get("channel") || undefined,
      assigneeId: searchParams.get("assigneeId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (!filters.success) return apiValidationError(filters.error);

    return apiSuccess(await listConversations(session.workspaceId, filters.data));
  } catch (err) {
    return handleApiError(err, "conversations:list");
  }
}

const createConversationSchema = z.object({
  contactId: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().max(200).optional(),
  channel: z.enum(["chat", "email"]).default("chat"),
  subject: z.string().max(500).optional(),
  firstMessage: z.string().min(1).max(10000),
});

// POST /api/conversations
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const body = await req.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) return apiValidationError(parsed.error);

    return apiSuccess(await createConversation(session, parsed.data), 201);
  } catch (err) {
    return handleApiError(err, "conversations:create");
  }
}

