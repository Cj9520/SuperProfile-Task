import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().optional(),
  bodyJson: z.string().optional(),
  bodyHtml: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const body = await req.json();
    const data = updateSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: { id: params.id, workspaceId: session.workspaceId },
    });
    if (!article) return apiError("Article not found", 404);

    const searchText = [
      data.data.title || article.title,
      data.data.excerpt || article.excerpt,
      (data.data.bodyHtml || article.bodyHtml)?.replace(/<[^>]*>/g, " "),
    ]
      .filter(Boolean)
      .join(" ");

    const updated = await prisma.knowledgeBaseArticle.update({
      where: { id: params.id },
      data: {
        ...data.data,
        searchText,
        publishedAt:
          data.data.status === "published" && !article.publishedAt
            ? new Date()
            : article.publishedAt,
      },
      include: {
        category: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });

    return apiSuccess({ article: updated });
  } catch (err) {
    console.error("[kb:article:patch]", err);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!article) return apiError("Article not found", 404);

  await prisma.knowledgeBaseArticle.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Article deleted" });
}
