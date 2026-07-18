import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { slugify } from "@/lib/utils";
import { suggestKBArticles } from "@/features/ai/service";
import type {
  ArticleInput,
  UpdateArticleInput,
  CategoryInput,
} from "@/features/kb/validation";

function toSearchText(parts: (string | null | undefined)[]) {
  return parts
    .map((p) => (p ? p.replace(/<[^>]*>/g, " ") : p))
    .filter(Boolean)
    .join(" ");
}

async function uniqueSlug(
  workspaceId: string,
  base: string,
  model: "article" | "category"
) {
  let slug = base;
  let counter = 1;
  const exists = async (s: string) =>
    model === "article"
      ? prisma.knowledgeBaseArticle.findUnique({
          where: { workspaceId_slug: { workspaceId, slug: s } },
        })
      : prisma.knowledgeBaseCategory.findUnique({
          where: { workspaceId_slug: { workspaceId, slug: s } },
        });
  while (await exists(slug)) slug = `${base}-${counter++}`;
  return slug;
}

// ─── Articles ────────────────────────────────────────────────────────────────

export async function listArticles(
  workspaceId: string,
  opts: { status?: string; categoryId?: string }
) {
  const articles = await prisma.knowledgeBaseArticle.findMany({
    where: {
      workspaceId,
      ...(opts.status && { status: opts.status }),
      ...(opts.categoryId && { categoryId: opts.categoryId }),
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return { articles };
}

export async function createArticle(
  session: { workspaceId: string; userId: string },
  input: ArticleInput
) {
  const slug = await uniqueSlug(
    session.workspaceId,
    slugify(input.title) || "article",
    "article"
  );

  const article = await prisma.knowledgeBaseArticle.create({
    data: {
      workspaceId: session.workspaceId,
      title: input.title,
      slug,
      excerpt: input.excerpt,
      bodyJson: input.bodyJson,
      bodyHtml: input.bodyHtml,
      categoryId: input.categoryId,
      status: input.status || "draft",
      searchText: toSearchText([input.title, input.excerpt, input.bodyHtml]),
      authorUserId: session.userId,
      publishedAt: input.status === "published" ? new Date() : null,
    },
    include: {
      category: true,
      author: { select: { name: true, avatarUrl: true } },
    },
  });

  return { article };
}

export async function updateArticle(
  workspaceId: string,
  id: string,
  input: UpdateArticleInput
) {
  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { id, workspaceId },
  });
  if (!article) throw new ApiError(404, "Article not found");

  const searchText = toSearchText([
    input.title || article.title,
    input.excerpt || article.excerpt,
    input.bodyHtml || article.bodyHtml,
  ]);

  const updated = await prisma.knowledgeBaseArticle.update({
    where: { id },
    data: {
      ...input,
      searchText,
      publishedAt:
        input.status === "published" && !article.publishedAt
          ? new Date()
          : article.publishedAt,
    },
    include: {
      category: true,
      author: { select: { name: true, avatarUrl: true } },
    },
  });

  return { article: updated };
}

export async function deleteArticle(workspaceId: string, id: string) {
  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { id, workspaceId },
  });
  if (!article) throw new ApiError(404, "Article not found");

  await prisma.knowledgeBaseArticle.delete({ where: { id } });
  return { message: "Article deleted" };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(workspaceId: string) {
  const categories = await prisma.knowledgeBaseCategory.findMany({
    where: { workspaceId },
    include: { _count: { select: { articles: true } } },
    orderBy: { orderIndex: "asc" },
  });
  return { categories };
}

export async function createCategory(workspaceId: string, input: CategoryInput) {
  const slug = await uniqueSlug(
    workspaceId,
    slugify(input.name) || "category",
    "category"
  );

  const category = await prisma.knowledgeBaseCategory.create({
    data: {
      workspaceId,
      name: input.name,
      slug,
      description: input.description,
      orderIndex: input.orderIndex || 0,
    },
  });

  return { category };
}

// ─── Public search ───────────────────────────────────────────────────────────

export async function publicSearch(opts: {
  q: string;
  workspaceId?: string | null;
  token?: string | null;
}) {
  const { q, workspaceId, token } = opts;
  if (!workspaceId && !token) {
    throw new ApiError(400, "workspaceId or token required");
  }

  let wsId = workspaceId || null;
  if (!wsId && token) {
    const ws = await prisma.workspace.findUnique({
      where: { widgetToken: token },
    });
    if (!ws) throw new ApiError(404, "Workspace not found");
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

  let articles = await prisma.knowledgeBaseArticle.findMany({
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

  // Natural-language questions ("my chat widget isn't loading") rarely match
  // as a whole phrase — fall back to per-keyword scoring across all published
  // articles so the widget's auto-suggest still surfaces relevant results.
  if (!articles.length && wsId && q.trim().split(/\s+/).length >= 2) {
    const published = await prisma.knowledgeBaseArticle.findMany({
      where: { workspaceId: wsId, status: "published" },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        searchText: true,
        category: { select: { name: true, slug: true } },
      },
    });
    const rankedIds = await suggestKBArticles(
      q,
      published.map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: [a.excerpt, a.searchText].filter(Boolean).join(" ") || null,
        slug: a.slug,
      }))
    );
    articles = rankedIds.flatMap((id) => {
      const match = published.find((a) => a.id === id);
      if (!match) return [];
      const { searchText: _searchText, ...rest } = match;
      return [rest];
    });
  }

  return { articles, query: q };
}
