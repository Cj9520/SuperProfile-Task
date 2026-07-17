import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { createSession, verifyInviteToken } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendVerificationEmail } from "@/features/email/service";
import type {
  SignupInput,
  LoginInput,
  AcceptInviteInput,
} from "@/features/auth/validation";

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "workspace";
  let slug = base;
  let counter = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

/** Create a new user + workspace, make the user its admin, and send a verification email. */
export async function signup(input: SignupInput) {
  const { name, email, password, workspaceName } = input;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await generateUniqueSlug(workspaceName);
  const widgetToken = `wt_${Math.random().toString(36).slice(2, 18)}`;
  const emailVerificationToken = randomUUID();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        globalStatus: "active",
        emailVerified: false,
        emailVerificationToken,
      },
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

    await tx.workspaceMember.create({
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
  });

  // Send verification email (non-blocking — don't fail signup if email send fails)
  await sendVerificationEmail(email, emailVerificationToken).catch((err) =>
    console.error("[signup] Failed to send verification email:", err)
  );

  return {
    message: "Account created! Please check your email to verify your account before logging in.",
  };
}

/** Validate credentials, open a session on the most recent accepted membership. */
export async function login(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspaceMembers: {
        where: { inviteStatus: "accepted" },
        include: { workspace: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.emailVerified) {
    throw new ApiError(403, "Please verify your email before logging in. Check your inbox for the verification link.");
  }

  if (user.globalStatus === "suspended") {
    throw new ApiError(403, "Your account has been suspended.");
  }

  const membership = user.workspaceMembers[0];
  if (!membership) {
    throw new ApiError(404, "No workspace found for this account.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    userId: user.id,
    workspaceId: membership.workspaceId,
    role: membership.role,
    memberId: membership.id,
  });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
    },
  };
}

/** Accept a team invite: create/update the user, mark membership accepted, open session. */
export async function acceptInvite(input: AcceptInviteInput) {
  const { token, name, password } = input;

  const payload = await verifyInviteToken(token);
  if (!payload) throw new ApiError(410, "Invite link expired or invalid");

  const member = await prisma.workspaceMember.findUnique({
    where: { id: payload.memberId },
    include: { workspace: true },
  });

  if (!member || member.inviteStatus !== "pending") {
    throw new ApiError(410, "Invite link expired or invalid");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user = await prisma.user.findUnique({ where: { email: payload.email } });

  const result = await prisma.$transaction(async (tx) => {
    if (!user) {
      user = await tx.user.create({
        data: {
          email: payload.email,
          passwordHash,
          name,
          globalStatus: "active",
        },
      });
    } else {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, name },
      });
    }

    const updatedMember = await tx.workspaceMember.update({
      where: { id: member.id },
      data: {
        userId: user!.id,
        inviteStatus: "accepted",
        inviteToken: null,
      },
    });

    return { user: user!, member: updatedMember };
  });

  await createSession({
    userId: result.user.id,
    workspaceId: member.workspaceId,
    role: member.role,
    memberId: member.id,
  });

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
    workspace: {
      id: member.workspace.id,
      name: member.workspace.name,
      slug: member.workspace.slug,
    },
  };
}
