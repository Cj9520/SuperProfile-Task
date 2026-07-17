import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

// POST /api/conversations/:id/read — mark all messages in conversation as read
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!conversation) return apiError("Conversation not found", 404);

  await prisma.message.updateMany({
    where: {
      conversationId: params.id,
      readAt: null,
      senderType: { in: ["customer", "system"] },
    },
    data: { readAt: new Date() },
  });

  return apiSuccess({ ok: true });
}
