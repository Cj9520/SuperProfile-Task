import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, slugify } from "@/lib/utils";
import { generateConversationSummary } from "@/lib/ai";

// POST /api/ai/conversations/:id/summarize
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
    include: {
      messages: {
        where: { channel: { not: "internal_note" } },
        orderBy: { createdAt: "asc" },
        select: { senderType: true, bodyText: true, createdAt: true },
      },
    },
  });

  if (!conversation) return apiError("Conversation not found", 404);
  if (conversation.messages.length < 2) {
    return apiError("Not enough messages to summarize", 400);
  }

  try {
    const summary = await generateConversationSummary(conversation.messages);

    const saved = await prisma.aiSummary.upsert({
      where: { conversationId: params.id },
      create: {
        conversationId: params.id,
        workspaceId: session.workspaceId,
        summaryText: summary.summaryText,
        userNeed: summary.userNeed,
        attemptedActions: summary.attemptedActions,
        currentStatus: summary.currentStatus,
        sourceMessageCount: conversation.messages.length,
        modelName: summary.modelName,
        generatedByUserId: session.userId,
        lastGeneratedAt: new Date(),
      },
      update: {
        summaryText: summary.summaryText,
        userNeed: summary.userNeed,
        attemptedActions: summary.attemptedActions,
        currentStatus: summary.currentStatus,
        sourceMessageCount: conversation.messages.length,
        modelName: summary.modelName,
        lastGeneratedAt: new Date(),
      },
    });

    return apiSuccess({ summary: saved });
  } catch (err) {
    console.error("[ai:summarize]", err);

    // Create a notification for the failure
    await prisma.notification.create({
      data: {
        workspaceId: session.workspaceId,
        userId: session.userId,
        type: "summary_failed",
        message: "AI summary generation failed. Please try again.",
        link: `/inbox/${params.id}`,
      },
    });

    return apiError("Summary service temporarily unavailable", 503);
  }
}

// GET /api/ai/conversations/:id/summary
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const summary = await prisma.aiSummary.findFirst({
    where: { conversationId: params.id, workspaceId: session.workspaceId },
  });

  if (!summary) return apiError("No summary available", 404);
  return apiSuccess({ summary });
}
