import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, User, BookOpen } from "lucide-react";
import type { Metadata } from "next";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { slug: params.slug, status: "published" },
  });
  return {
    title: article ? `${article.title} — Help Center` : "Article Not Found",
    description: article?.excerpt || undefined,
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { slug: params.slug, status: "published" },
    include: {
      category: true,
      author: { select: { name: true } },
      workspace: { select: { name: true, id: true } },
    },
  });

  if (!article) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb header */}
      <div className="gradient-bg py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/help?workspaceId=${article.workspace.id}`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {article.workspace.name} Help Center
          </Link>
          {article.category && (
            <p className="text-indigo-300 text-sm mb-2 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {article.category.name}
            </p>
          )}
          <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 mt-3 text-white/50 text-xs">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {article.author.name}
            </span>
            {article.publishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Article content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        {article.excerpt && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed border-l-4 border-primary pl-4">
            {article.excerpt}
          </p>
        )}

        {article.bodyHtml ? (
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
          />
        ) : (
          <p className="text-muted-foreground">No content available.</p>
        )}

        {/* Footer nav */}
        <div className="mt-12 pt-8 border-t">
          <Link
            href={`/help?workspaceId=${article.workspace.id}`}
            className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
        </div>
      </main>
    </div>
  );
}
