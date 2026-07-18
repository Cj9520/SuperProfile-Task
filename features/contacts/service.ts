import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

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

export async function createContact(
  workspaceId: string,
  data: { name?: string; email?: string }
) {
  const contact = await prisma.contact.create({
    data: {
      workspaceId,
      name: data.name || null,
      email: data.email || null,
      source: "imported",
      lastSeenAt: new Date(),
    },
  });
  return { contact };
}

export async function getContactDetail(workspaceId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
    include: {
      _count: { select: { conversations: true } },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 20,
        select: {
          id: true,
          channel: true,
          status: true,
          subject: true,
          lastMessageAt: true,
          createdAt: true,
          _count: { select: { messages: true } },
          assignee: {
            select: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!contact) throw new ApiError(404, "Contact not found");
  return { contact };
}

