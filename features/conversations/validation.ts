import { z } from "zod";

export const conversationFiltersSchema = z.object({
  status: z.string().optional(),
  channel: z.string().optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(30),
});

export const updateConversationSchema = z.object({
  status: z.enum(["open", "snoozed", "resolved"]).optional(),
  assigneeMemberId: z.string().nullable().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  snoozedUntil: z.string().datetime().nullable().optional(),
  subject: z.string().optional(),
});

export const messageSchema = z.object({
  bodyText: z.string().min(1).max(10000),
  bodyHtml: z.string().optional(),
  channel: z.enum(["chat", "email", "internal_note"]).optional(),
});

export type ConversationFilters = z.infer<typeof conversationFiltersSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
