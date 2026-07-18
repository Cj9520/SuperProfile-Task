import { z } from "zod";

const email = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email must be at most 254 characters")
  .email("Please enter a valid email address");

const password = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be at most 100 characters");

const personName = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be at most 100 characters");

export const signupSchema = z.object({
  name: personName,
  email,
  password,
  workspaceName: z
    .string({ required_error: "Workspace name is required" })
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name must be at most 100 characters"),
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export const acceptInviteSchema = z.object({
  token: z.string({ required_error: "Invite token is required" }).min(1),
  name: personName,
  password,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
