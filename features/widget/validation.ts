import { z } from "zod";

export const sessionSchema = z.object({
  widgetToken: z.string().min(1),
  visitorToken: z.string().optional(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  currentPageUrl: z.string().optional(),
  userAgent: z.string().optional(),
});

export const widgetMessageSchema = z.object({
  visitorToken: z.string().min(1),
  bodyText: z.string().min(1).max(5000),
});

export const typingSchema = z.object({
  visitorToken: z.string().min(1),
  isTyping: z.boolean(),
});

export type SessionInput = z.infer<typeof sessionSchema>;
export type WidgetMessageInput = z.infer<typeof widgetMessageSchema>;
export type TypingInput = z.infer<typeof typingSchema>;
