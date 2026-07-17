import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/contacts?search=...&source=...&page=1
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const source = searchParams.get("source") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    workspaceId: session.workspaceId,
  };

  if (search.length >= 2) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (source) where.source = source;

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        _count: { select: { conversations: true } },
      },
      orderBy: { lastSeenAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return apiSuccess({ contacts, total, page, limit });
}
