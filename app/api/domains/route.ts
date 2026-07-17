import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  const domains = await prisma.customDomain.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ domains });
}

const domainSchema = z.object({
  hostname: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+$/, "Invalid hostname"),
  provider: z.enum(["cloudflare", "vercel", "manual"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  try {
    const body = await req.json();
    const data = domainSchema.safeParse(body);
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const existing = await prisma.customDomain.findUnique({
      where: { hostname: data.data.hostname },
    });
    if (existing) return apiError("Domain already connected", 409);

    const domain = await prisma.customDomain.create({
      data: {
        workspaceId: session.workspaceId,
        hostname: data.data.hostname,
        provider: data.data.provider || "manual",
      },
    });

    return apiSuccess({
      domain,
      instructions: {
        type: "CNAME",
        name: domain.hostname,
        value: `${process.env.APP_URL?.replace("https://", "").replace("http://", "") || "your-app.vercel.app"}`,
        verificationToken: domain.verificationToken,
        txtRecord: {
          name: `_superprofile-verify.${domain.hostname}`,
          value: domain.verificationToken,
        },
      },
    }, 201);
  } catch (err) {
    console.error("[domains:post]", err);
    return apiError("Internal server error", 500);
  }
}
