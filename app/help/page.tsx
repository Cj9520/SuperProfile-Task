import { prisma } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Search, ChevronRight, Zap } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Help Center — SuperProfile",
  description: "Find answers in our knowledge base",
};

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; workspaceId?: string }>;
}) {
  const { q = "", workspaceId } = await searchParams;

  // Find workspace (by custom domain or first workspace if demo)
  const workspace = workspaceId
    ? await prisma.workspace.findUnique({ where: { id: workspaceId } })
    : await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Help center not found</p>
      </div>
    );
  }

  const where = {
    workspaceId: workspace.id,
    status: "published" as const,
    ...(q.length >= 2
      ? {
          OR: [
            { title: { contains: q } },
            { excerpt: { contains: q } },
            { searchText: { contains: q } },
          ],
        }
      : {}),
  };

  const [articles, categories] = await Promise.all([
    prisma.knowledgeBaseArticle.findMany({
      where,
      include: { category: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    prisma.knowledgeBaseCategory.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    }),
  ]);

  const articlesByCategory = categories.reduce(
    (acc, cat) => {
      acc[cat.id] = articles.filter(
        (a) => a.categoryId === cat.id && a.status === "published"
      );
      return acc;
    },
    {} as Record<string, typeof articles>
  );
  const uncategorized = articles.filter((a) => !a.categoryId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-white text-2xl font-bold">{workspace.name}</h1>
          </div>
          <p className="text-3xl font-extrabold text-white mb-8">
            How can we help you?
          </p>

          {/* Search */}
          <form className="max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search articles…"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-base focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
              />
            </div>
          </form>

          <p className="text-indigo-200 text-sm mt-4">
            {articles.length} articles · {categories.length} categories
          </p>
        </div>
      </div>

      {/* Articles */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {q && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-1">
              {articles.length === 0
                ? "No results for"
                : `${articles.length} results for`}{" "}
              <span className="text-primary">&quot;{q}&quot;</span>
            </h2>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-primary">
              ← Clear search
            </Link>
          </div>
        )}

        {q ? (
          <div className="grid gap-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {categories
              .filter((c) => (articlesByCategory[c.id]?.length || 0) > 0)
              .map((cat) => (
                <section key={cat.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">{cat.name}</h2>
                    <span className="text-sm text-muted-foreground">
                      ({cat._count.articles} articles)
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {articlesByCategory[cat.id]?.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                </section>
              ))}

            {uncategorized.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Other articles</h2>
                <div className="grid gap-3">
                  {uncategorized.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {articles.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  No articles published yet
                </p>
                <p className="text-muted-foreground/60 text-sm mt-1">
                  Check back soon for helpful content
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="text-primary hover:underline font-medium">
            SuperProfile
          </Link>
        </p>
      </footer>
    </div>
  );
}

function ArticleCard({
  article,
}: {
  article: { id: string; title: string; slug: string; excerpt?: string | null };
}) {
  return (
    <Link
      href={`/help/${article.slug}`}
      className="group flex items-start justify-between p-4 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {article.excerpt}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5 ml-3 transition-colors" />
    </Link>
  );
}
