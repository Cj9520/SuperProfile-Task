import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess, slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const categories = await prisma.knowledgeBaseCategory.findMany({
    where: { workspaceId: session.workspaceId },
    include: { _count: { select: { articles: true } } },
    orderBy: { orderIndex: "asc" },
  });

  return apiSuccess({ categories });
}

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const body = await req.json();
    const data = categorySchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const baseSlug = slugify(data.data.name) || "category";
    let slug = baseSlug;
    let counter = 1;
    while (
      await prisma.knowledgeBaseCategory.findUnique({
        where: { workspaceId_slug: { workspaceId: session.workspaceId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    const category = await prisma.knowledgeBaseCategory.create({
      data: {
        workspaceId: session.workspaceId,
        name: data.data.name,
        slug,
        description: data.data.description,
        orderIndex: data.data.orderIndex || 0,
      },
    });

    return apiSuccess({ category }, 201);
  } catch (err) {
    console.error("[kb:categories:post]", err);
    return apiError("Internal server error", 500);
  }
}
