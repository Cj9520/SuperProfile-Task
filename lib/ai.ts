import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Parse the JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    summaryText: parsed.summaryText || "Unable to generate summary.",
    userNeed: parsed.userNeed || "Not specified",
    attemptedActions: parsed.attemptedActions || "None documented",
    currentStatus: parsed.currentStatus || "Under review",
    modelName: "gemini-1.5-flash",
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
