import { z } from "zod";

export const domainSchema = z.object({
  hostname: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+$/, "Invalid hostname"),
  provider: z.enum(["cloudflare", "vercel", "manual"]).optional(),
});

export type DomainInput = z.infer<typeof domainSchema>;
