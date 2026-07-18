import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

export interface AISummaryResult {
  summaryText: string;
  userNeed: string;
  attemptedActions: string;
  currentStatus: string;
  modelName: string;
}

export async function generateConversationSummary(
  messages: Array<{ senderType: string; bodyText: string; createdAt: Date }>
): Promise<AISummaryResult> {
  const messageHistory = messages
    .map(
      (m) =>
        `[${m.senderType.toUpperCase()}] ${m.bodyText}`
    )
    .join("\n\n");

  const prompt = `You are a customer support AI assistant. Analyze this support conversation and provide a structured summary.

CONVERSATION:
${messageHistory}

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "summaryText": "2-3 sentence overview of the issue",
  "userNeed": "What the customer wants or needs",
  "attemptedActions": "What has been tried so far to resolve this",
  "currentStatus": "Current state of the issue resolution"
}`;

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY || ""}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content || "").trim();

  // Parse the JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    summaryText: parsed.summaryText || "Unable to generate summary.",
    userNeed: parsed.userNeed || "Not specified",
    attemptedActions: parsed.attemptedActions || "None documented",
    currentStatus: parsed.currentStatus || "Under review",
    modelName: DEEPSEEK_MODEL,
  };
}

export async function suggestKBArticles(
  query: string,
  articles: Array<{ id: string; title: string; excerpt: string | null; slug: string }>
): Promise<string[]> {
  if (!articles.length) return [];

  // Simple keyword matching for MVP (no AI needed, keeps it fast)
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  const scored = articles.map((article) => {
    const text = `${article.title} ${article.excerpt || ""}`.toLowerCase();
    const score = queryWords.filter((word) => text.includes(word)).length;
    return { id: article.id, score };
  });

  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => a.id);
}

// ─── Conversation summary orchestration ───────────────────────────────────────

/** Generate (or refresh) the AI summary for a conversation and persist it. */
export async function summarizeConversation(
  session: { workspaceId: string; userId: string },
  id: string
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: session.workspaceId },
    include: {
      messages: {
        where: { channel: { not: "internal_note" } },
        orderBy: { createdAt: "asc" },
        select: { senderType: true, bodyText: true, createdAt: true },
      },
    },
  });

  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (conversation.messages.length < 2) {
    throw new ApiError(400, "Not enough messages to summarize");
  }

  try {
    const summary = await generateConversationSummary(conversation.messages);

    const saved = await prisma.aiSummary.upsert({
      where: { conversationId: id },
      create: {
        conversationId: id,
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

    return { summary: saved };
  } catch (err) {
    console.error("[ai:summarize]", err);
    await prisma.notification.create({
      data: {
        workspaceId: session.workspaceId,
        userId: session.userId,
        type: "summary_failed",
        message: "AI summary generation failed. Please try again.",
        link: `/inbox/${id}`,
      },
    });
    throw new ApiError(503, "Summary service temporarily unavailable");
  }
}

export async function getSummary(workspaceId: string, id: string) {
  const summary = await prisma.aiSummary.findFirst({
    where: { conversationId: id, workspaceId },
  });
  return { summary: summary ?? null };
}
