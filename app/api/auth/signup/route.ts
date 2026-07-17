import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { slugify, apiError, apiSuccess, checkRateLimit } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  workspaceName: z.string().min(2).max(100),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per IP per 15 min
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  try {
    const body = await req.json();
    const data = signupSchema.safeParse(body);

    if (!data.success) {
      return apiError(data.error.errors[0].message, 422);
    }

    const { name, email, password, workspaceName } = data.data;

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = await generateUniqueSlug(workspaceName);
    const widgetToken = `wt_${Math.random().toString(36).slice(2, 18)}`;

    // Create user + workspace in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, globalStatus: "active" },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
          widgetToken,
          createdByUserId: user.id,
          supportEmail: `support+${slug}@superprofile.app`,
        },
      });

      const member = await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "admin",
          inviteStatus: "accepted",
        },
      });

      // Seed default KB category
      await tx.knowledgeBaseCategory.create({
        data: {
          workspaceId: workspace.id,
          name: "Getting Started",
          slug: "getting-started",
          description: "Everything you need to know to get started",
          orderIndex: 0,
        },
      });

      return { user, workspace, member };
    });

    await createSession({
      userId: result.user.id,
      workspaceId: result.workspace.id,
      role: "admin",
      memberId: result.member.id,
    });

    return apiSuccess({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      workspace: {
        id: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
        widgetToken: result.workspace.widgetToken,
      },
    }, 201);
  } catch (err) {
    console.error("[signup]", err);
    return apiError("Internal server error", 500);
  }
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "workspace";
  let slug = base;
  let counter = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}
