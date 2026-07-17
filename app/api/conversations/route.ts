import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/conversations
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const channel = searchParams.get("channel") || undefined;
  const assigneeId = searchParams.get("assigneeId") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { workspaceId: session.workspaceId };

  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (assigneeId === "unassigned") {
    where.assigneeMemberId = null;
  } else if (assigneeId) {
    where.assigneeMemberId = assigneeId;
  }

  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { contact: { name: { contains: search } } },
      { contact: { email: { contains: search } } },
    ];
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignee: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { bodyText: true, createdAt: true, senderType: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ]);

  return apiSuccess({ conversations, total, page, limit });
}
