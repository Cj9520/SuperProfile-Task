import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import type { DomainInput } from "@/features/domains/validation";

export async function listDomains(workspaceId: string) {
  const domains = await prisma.customDomain.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return { domains };
}

export async function addDomain(workspaceId: string, input: DomainInput) {
  const existing = await prisma.customDomain.findUnique({
    where: { hostname: input.hostname },
  });
  if (existing) throw new ApiError(409, "Domain already connected");

  const domain = await prisma.customDomain.create({
    data: {
      workspaceId,
      hostname: input.hostname,
      provider: input.provider || "manual",
    },
  });

  const appHost =
    process.env.APP_URL?.replace("https://", "").replace("http://", "") ||
    "your-app.vercel.app";

  return {
    domain,
    instructions: {
      type: "CNAME",
      name: domain.hostname,
      value: appHost,
      verificationToken: domain.verificationToken,
      txtRecord: {
        name: `_superprofile-verify.${domain.hostname}`,
        value: domain.verificationToken,
      },
    },
  };
}

/**
 * TODO(P2): replace the simulated check with a real DNS lookup
 * (dns.promises.resolveTxt / resolveCname against `verificationToken`) and
 * provider SSL provisioning. Behavior preserved from the original for now.
 */
export async function verifyDomain(workspaceId: string, id: string) {
  const domain = await prisma.customDomain.findFirst({
    where: { id, workspaceId },
  });
  if (!domain) throw new ApiError(404, "Domain not found");

  const verified = Math.random() > 0.3; // Simulated; see TODO above.
  const updated = await prisma.customDomain.update({
    where: { id },
    data: {
      verificationStatus: verified ? "verified" : "pending",
      sslStatus: verified ? "active" : "pending",
    },
  });

  return {
    domain: updated,
    message: verified
      ? "Domain verified successfully!"
      : "Verification pending. DNS changes can take up to 48 hours.",
  };
}

export async function removeDomain(workspaceId: string, id: string) {
  const domain = await prisma.customDomain.findFirst({
    where: { id, workspaceId },
  });
  if (!domain) throw new ApiError(404, "Domain not found");

  await prisma.customDomain.delete({ where: { id } });
  return { message: "Domain removed" };
}
