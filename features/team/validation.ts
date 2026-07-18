import { z } from "zod";

export const inviteSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .max(254, "Email must be at most 254 characters")
    .email("Please enter a valid email address"),
  role: z.enum(["admin", "agent"]),
});

export const updateMemberSchema = z.object({
  role: z.enum(["admin", "agent"]).optional(),
  inviteStatus: z.enum(["pending", "accepted", "revoked"]).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
