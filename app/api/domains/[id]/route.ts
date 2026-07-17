import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  const domain = await prisma.customDomain.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!domain) return apiError("Domain not found", 404);

  await prisma.customDomain.delete({ where: { id: params.id } });
  return apiSuccess({ message: "Domain removed" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return apiError("Authentication required", 401);
  if (session.role !== "admin") return apiError("Insufficient permissions", 403);

  const domain = await prisma.customDomain.findFirst({
    where: { id: params.id, workspaceId: session.workspaceId },
  });
  if (!domain) return apiError("Domain not found", 404);

  // Simulate DNS check (real implementation would query DNS)
  const verified = Math.random() > 0.3; // 70% chance for demo
  const updated = await prisma.customDomain.update({
    where: { id: params.id },
    data: {
      verificationStatus: verified ? "verified" : "pending",
      sslStatus: verified ? "active" : "pending",
    },
  });

  return apiSuccess({
    domain: updated,
    message: verified
      ? "Domain verified successfully!"
      : "Verification pending. DNS changes can take up to 48 hours.",
  });
}
