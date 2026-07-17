import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/public/kb/search?q=...&workspaceId=...&token=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const workspaceId = searchParams.get("workspaceId");
  const token = searchParams.get("token");

  if (!workspaceId && !token) {
    return apiError("workspaceId or token required", 400);
  }

  // Find workspace
  let wsId = workspaceId;
  if (!wsId && token) {
    const ws = await prisma.workspace.findUnique({ where: { widgetToken: token } });
    if (!ws) return apiError("Workspace not found", 404);
    wsId = ws.id;
  }

  const where: Record<string, unknown> = {
    workspaceId: wsId,
    status: "published",
  };

  if (q.length >= 2) {
    where.OR = [
      { title: { contains: q } },
      { excerpt: { contains: q } },
      { searchText: { contains: q } },
    ];
  }

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return apiSuccess({ articles, query: q });
}
