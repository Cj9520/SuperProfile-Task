import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "agent"]),
});

export const updateMemberSchema = z.object({
  role: z.enum(["admin", "agent"]).optional(),
  inviteStatus: z.enum(["pending", "accepted", "revoked"]).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
