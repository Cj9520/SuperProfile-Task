import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/utils";

// GET /api/widget/config/:token
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const workspace = await prisma.workspace.findUnique({
    where: { widgetToken: params.token },
    select: {
      id: true,
      name: true,
      widgetToken: true,
    },
  });

  if (!workspace) return apiError("Invalid widget token", 404);

  return apiSuccess({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      widgetToken: workspace.widgetToken,
    },
    pusherKey: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || "",
    pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
  });
}
