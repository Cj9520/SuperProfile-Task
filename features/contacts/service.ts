import { prisma } from "@/lib/db";

export async function listContacts(
  workspaceId: string,
  opts: { search?: string; source?: string; page: number; limit: number }
) {
  const { search = "", source = "", page, limit } = opts;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { workspaceId };
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
      include: { _count: { select: { conversations: true } } },
      orderBy: { lastSeenAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, page, limit };
}
