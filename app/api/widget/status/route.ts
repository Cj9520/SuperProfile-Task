import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/widget/status?token=... — returns whether any agent is online
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return apiError("token required", 400);

  const workspace = await prisma.workspace.findUnique({
    where: { widgetToken: token },
    include: {
      members: {
        where: { inviteStatus: "accepted" },
        include: {
          user: { select: { lastLoginAt: true } },
        },
        take: 10,
      },
    },
  });

  if (!workspace) return apiError("Workspace not found", 404);

  // Consider an agent "online" if they logged in within the last 8 hours
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const isOnline = workspace.members.some(
    (m) => m.user.lastLoginAt && m.user.lastLoginAt > eightHoursAgo
  );

  return apiSuccess({
    isOnline,
    responseTime: isOnline ? "Typically replies in a few minutes" : "We'll reply as soon as possible",
  });
}
