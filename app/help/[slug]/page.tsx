import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, User, BookOpen, Zap } from "lucide-react";
import type { Metadata } from "next";

type Props = { params: { slug: string }; searchParams: { workspaceId?: string } };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const workspace = searchParams.workspaceId
    ? await prisma.workspace.findUnique({ where: { id: searchParams.workspaceId } })
    : await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });

  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { slug: params.slug, workspaceId: workspace?.id, status: "published" },
    select: { title: true, excerpt: true },
  });

  if (!article) return { title: "Article not found" };

  return {
    title: `${article.title} — ${workspace?.name || "Help Center"}`,
    description: article.excerpt || undefined,
  };
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const workspace = searchParams.workspaceId
    ? await prisma.workspace.findUnique({ where: { id: searchParams.workspaceId } })
    : await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });

  if (!workspace) notFound();

  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { slug: params.slug, workspaceId: workspace.id, status: "published" },
    include: {
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
    },
  });

  if (!article) notFound();

  const helpBase = `/help${searchParams.workspaceId ? `?workspaceId=${searchParams.workspaceId}` : ""}`;

  // Fetch related articles from same category
  const related = article.categoryId
    ? await prisma.knowledgeBaseArticle.findMany({
        where: {
          workspaceId: workspace.id,
          categoryId: article.categoryId,
          status: "published",
          id: { not: article.id },
        },
        select: { id: true, title: true, slug: true, excerpt: true },
        take: 4,
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top gradient header */}
      <div className="gradient-bg py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <Link href={helpBase} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              {workspace.name} Help Center
            </Link>
            {article.category && (
              <>
                <span className="text-white/40 text-sm">/</span>
                <span className="text-white/60 text-sm">{article.category.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          {/* Article */}
          <article>
            <Link
              href={helpBase}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Help Center
            </Link>

            {article.category && (
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {article.category.name}
                </span>
              </div>
            )}

            <h1 className="text-3xl font-extrabold text-foreground mb-5 leading-tight">
              {article.title}
            </h1>

            <div className="flex items-center gap-5 mb-8 pb-6 border-b text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {article.author.name}
              </span>
              {article.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(article.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>

            {article.excerpt && (
              <p className="text-base text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary/40 pl-4 italic">
                {article.excerpt}
              </p>
            )}

            {article.bodyHtml ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-foreground prose-headings:tracking-tight
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                  prose-p:text-foreground/80 prose-p:leading-relaxed
                  prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
                  prose-code:rounded prose-code:text-sm prose-code:font-mono
                  prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl prose-pre:p-4
                  prose-ul:text-foreground/80 prose-ol:text-foreground/80
                  prose-li:my-0.5 prose-li:leading-relaxed
                  prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                  prose-hr:border-border"
                dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Content coming soon.</p>
              </div>
            )}

            {/* Feedback + back nav */}
            <div className="mt-14 pt-8 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Link
                href={helpBase}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                All articles
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Was this helpful?</span>
                <button className="px-3 py-1.5 rounded-lg border text-xs hover:border-emerald-400 hover:text-emerald-600 transition-all">
                  👍 Yes
                </button>
                <button className="px-3 py-1.5 rounded-lg border text-xs hover:border-rose-400 hover:text-rose-600 transition-all">
                  👎 No
                </button>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-6">
              {related.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Related Articles
                  </h3>
                  <div className="space-y-2">
                    {related.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/help/${rel.slug}${searchParams.workspaceId ? `?workspaceId=${searchParams.workspaceId}` : ""}`}
                        className="block p-3 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                      >
                        <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {rel.title}
                        </p>
                        {rel.excerpt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {rel.excerpt}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-semibold text-foreground mb-1">Still need help?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Our support team is happy to assist you.
                </p>
                <a
                  href={`mailto:${workspace.supportEmail || "support@" + workspace.slug + ".com"}`}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Contact support →
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t py-8 text-center mt-4">
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
