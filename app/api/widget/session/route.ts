import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";

const sessionSchema = z.object({
  widgetToken: z.string().min(1),
  visitorToken: z.string().optional(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  currentPageUrl: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = sessionSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const workspace = await prisma.workspace.findUnique({
      where: { widgetToken: data.data.widgetToken },
    });
    if (!workspace) return apiError("Invalid widget token", 404);

    // Try to recover existing session
    if (data.data.visitorToken) {
      const existing = await prisma.chatSession.findUnique({
        where: { visitorToken: data.data.visitorToken },
        include: { conversation: true },
      });
      if (existing && existing.workspaceId === workspace.id) {
        await prisma.chatSession.update({
          where: { id: existing.id },
          data: {
            isOnline: true,
            lastSeenAt: new Date(),
            currentPageUrl: data.data.currentPageUrl,
          },
        });
        return apiSuccess({ session: existing, isNew: false });
      }
    }

    // Generate new visitor token
    const visitorToken =
      data.data.visitorToken ||
      `vt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

    // Create or find contact
    let contact = data.data.visitorEmail
      ? await prisma.contact.findFirst({
          where: { workspaceId: workspace.id, email: data.data.visitorEmail },
        })
      : null;

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: data.data.visitorEmail,
          name: data.data.visitorName,
          source: "chat",
          lastSeenAt: new Date(),
        },
      });
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        channel: "chat",
        subject: `Chat from ${data.data.visitorName || "Visitor"}`,
        status: "open",
        lastMessageAt: new Date(),
      },
    });

    const session = await prisma.chatSession.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversation.id,
        visitorToken,
        visitorName: data.data.visitorName,
        visitorEmail: data.data.visitorEmail,
        currentPageUrl: data.data.currentPageUrl,
        userAgent: data.data.userAgent,
        isOnline: true,
        lastSeenAt: new Date(),
      },
    });

    return apiSuccess({ session, conversation, isNew: true }, 201);
  } catch (err) {
    console.error("[widget:session]", err);
    return apiError("Internal server error", 500);
  }
}
