import { resolveCname, resolveTxt } from "dns/promises";
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
 * Verify ownership via a TXT record at _superprofile-verify.<hostname>
 * containing the verification token, and routing via a CNAME pointing at
 * this app's host. TXT proves ownership and is sufficient to verify;
 * a missing CNAME is reported so the user can finish routing. SSL is
 * terminated by the platform (Vercel/Let's Encrypt) once the CNAME resolves.
 */
export async function verifyDomain(workspaceId: string, id: string) {
  const domain = await prisma.customDomain.findFirst({
    where: { id, workspaceId },
  });
  if (!domain) throw new ApiError(404, "Domain not found");

  const appHost =
    process.env.APP_URL?.replace("https://", "").replace("http://", "") || "";

  const [txtRecords, cnameRecords] = await Promise.all([
    resolveTxt(`_superprofile-verify.${domain.hostname}`).catch(() => []),
    resolveCname(domain.hostname).catch(() => []),
  ]);

  const txtOk = txtRecords.some((chunks) =>
    chunks.join("").trim() === domain.verificationToken
  );
  const cnameOk =
    appHost.length > 0 &&
    cnameRecords.some((c) => c.toLowerCase().replace(/\.$/, "") === appHost.toLowerCase());

  const verified = txtOk;
  const updated = await prisma.customDomain.update({
    where: { id },
    data: {
      verificationStatus: verified ? "verified" : "pending",
      sslStatus: verified && cnameOk ? "active" : "pending",
    },
  });

  return {
    domain: updated,
    message: verified
      ? cnameOk
        ? "Domain verified successfully!"
        : "Ownership verified via TXT record. Add the CNAME record to finish routing — SSL activates once it resolves."
      : "Verification pending. Add the TXT record shown in the instructions; DNS changes can take up to 48 hours.",
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
