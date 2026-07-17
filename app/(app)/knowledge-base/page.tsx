"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, FileText, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { cn, formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";

type Article = {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string | null;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
  author: { name: string };
};

type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
};

export default function KBPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your help article…" }),
      Link.configure({ openOnClick: false }),
    ],
    content: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [articlesRes, categoriesRes] = await Promise.all([
      fetch("/api/kb/articles"),
      fetch("/api/kb/categories"),
    ]);
    if (articlesRes.ok) setArticles((await articlesRes.json()).articles || []);
    if (categoriesRes.ok) setCategories((await categoriesRes.json()).categories || []);
    setLoading(false);
  }

  function openNewArticle() {
    setEditingArticle(null);
    setTitle("");
    setExcerpt("");
    setSelectedCategory("");
    setStatus("draft");
    editor?.commands.setContent("");
    setView("editor");
  }

  function openEditArticle(article: Article) {
    setEditingArticle(article);
    setTitle(article.title);
    setExcerpt(article.excerpt || "");
    setSelectedCategory(article.category?.id || "");
    setStatus(article.status as "draft" | "published");
    setView("editor");
  }

  async function saveArticle() {
    if (!title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      const bodyHtml = editor?.getHTML() || "";
      const payload = {
        title,
        excerpt,
        bodyHtml,
        categoryId: selectedCategory || undefined,
        status,
      };

      const res = editingArticle?.id
        ? await fetch(`/api/kb/articles/${editingArticle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/kb/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        toast.success(
          status === "published" ? "Article published! 🎉" : "Article saved as draft"
        );
        fetchData();
        setView("list");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save article");
      }
    } catch {
      toast.error("Failed to save article");
    } finally {
      setSaving(false);
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm("Delete this article?")) return;
    const res = await fetch(`/api/kb/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Article deleted");
      fetchData();
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/kb/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    if (res.ok) {
      toast.success("Category created");
      setNewCategoryName("");
      setAddingCategory(false);
      fetchData();
    }
  }

  if (view === "editor") {
    return (
      <div className="flex flex-col h-full">
        {/* Editor header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>
              ← Back
            </Button>
            <span className="text-sm text-muted-foreground">
              {editingArticle ? "Edit Article" : "New Article"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatus(status === "draft" ? "published" : "draft")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {status === "published" ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              {status === "published" ? "Published" : "Draft"}
            </button>
            <Button size="sm" onClick={saveArticle} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Save article
            </Button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Category selector */}
            <div className="mb-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <input
              className="w-full text-3xl font-bold border-0 outline-none placeholder:text-muted-foreground/40 bg-transparent mb-2"
              placeholder="Article title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Excerpt */}
            <input
              className="w-full text-base text-muted-foreground border-0 border-b outline-none placeholder:text-muted-foreground/40 bg-transparent mb-6 pb-2"
              placeholder="Short description (excerpt)…"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />

            {/* Rich text editor */}
            <div className="border rounded-xl overflow-hidden">
              <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
                {[
                  { cmd: "toggleBold", label: "B", className: "font-bold" },
                  { cmd: "toggleItalic", label: "I", className: "italic" },
                  { cmd: "toggleBulletList", label: "•—" },
                  { cmd: "toggleOrderedList", label: "1." },
                  { cmd: "toggleBlockquote", label: "❝" },
                  { cmd: "toggleCode", label: "</>" },
                ].map((btn) => (
                  <button
                    key={btn.cmd}
                    onClick={() => {
                      const chain = editor?.chain().focus() as Record<string, () => { run: () => void }> | undefined;
                      chain?.[btn.cmd]?.().run();
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs hover:bg-muted transition-colors",
                      btn.className
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <EditorContent editor={editor} className="min-h-[300px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: categories */}
      <div className="w-56 border-r bg-background flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Knowledge Base</h2>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <button
            onClick={() => {}}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors mb-0.5 font-medium"
          >
            All articles ({articles.length})
          </button>

          <div className="mt-3 mb-1">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Categories
            </p>
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <span className="truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground/60 ml-1 shrink-0">
                  {c._count.articles}
                </span>
              </div>
            ))}

            {addingCategory ? (
              <div className="px-3 py-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-7 text-xs mb-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCategory();
                    if (e.key === "Escape") setAddingCategory(false);
                  }}
                />
                <div className="flex gap-1">
                  <button
                    onClick={addCategory}
                    className="text-xs text-primary hover:underline"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAddingCategory(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                New category
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Main: articles */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b">
          <div>
            <h1 className="text-sm font-semibold">Articles</h1>
            <p className="text-xs text-muted-foreground">
              {articles.length} articles total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href="/help" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Public KB
              </a>
            </Button>
            <Button size="sm" onClick={openNewArticle}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New article
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No articles yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Create your first help article
              </p>
              <Button size="sm" onClick={openNewArticle}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create article
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                  <th className="text-left px-6 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium line-clamp-1">
                          {article.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {article.category?.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          article.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(article.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEditArticle(article)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteArticle(article.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
