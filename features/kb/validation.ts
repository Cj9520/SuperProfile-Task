import { z } from "zod";

export const articleSchema = z.object({
  title: z.string().min(1).max(500),
  excerpt: z.string().optional(),
  bodyJson: z.string().optional(),
  bodyHtml: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().optional(),
  bodyJson: z.string().optional(),
  bodyHtml: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
});

export type ArticleInput = z.infer<typeof articleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
