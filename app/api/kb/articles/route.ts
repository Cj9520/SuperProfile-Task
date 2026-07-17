import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, slugify } from "@/lib/utils";

// GET /api/kb/articles?status=published&categoryId=...
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;

  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: {
      workspaceId: session.workspaceId,
      ...(status && { status }),
      ...(categoryId && { categoryId }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiSuccess({ articles });
}

const articleSchema = z.object({
  title: z.string().min(1).max(500),
  excerpt: z.string().optional(),
  bodyJson: z.string().optional(),
  bodyHtml: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// POST /api/kb/articles
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  try {
    const body = await req.json();
    const data = articleSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    // Generate unique slug
    const baseSlug = slugify(data.data.title) || "article";
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.knowledgeBaseArticle.findUnique({
        where: { workspaceId_slug: { workspaceId: session.workspaceId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Build search text for full-text search
    const searchText = [
      data.data.title,
      data.data.excerpt,
      data.data.bodyHtml?.replace(/<[^>]*>/g, " "),
    ]
      .filter(Boolean)
      .join(" ");

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        workspaceId: session.workspaceId,
        title: data.data.title,
        slug,
        excerpt: data.data.excerpt,
        bodyJson: data.data.bodyJson,
        bodyHtml: data.data.bodyHtml,
        categoryId: data.data.categoryId,
        status: data.data.status || "draft",
        searchText,
        authorUserId: session.userId,
        publishedAt: data.data.status === "published" ? new Date() : null,
      },
      include: {
        category: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });

    return apiSuccess({ article }, 201);
  } catch (err) {
    console.error("[kb:articles:post]", err);
    return apiError("Internal server error", 500);
  }
}
