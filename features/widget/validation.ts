import { z } from "zod";

export const sessionSchema = z.object({
  widgetToken: z.string().min(1, "Widget token is required").max(64),
  visitorToken: z.string().max(64).optional(),
  visitorName: z.string().trim().max(100).optional(),
  visitorEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .email("Please enter a valid email address")
    .optional(),
  currentPageUrl: z.string().max(2048).optional(),
  userAgent: z.string().max(512).optional(),
});

export const widgetMessageSchema = z.object({
  visitorToken: z.string().min(1, "Visitor token is required").max(64),
  bodyText: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be at most 5000 characters"),
});

export const typingSchema = z.object({
  visitorToken: z.string().min(1, "Visitor token is required").max(64),
  isTyping: z.boolean(),
});

export type SessionInput = z.infer<typeof sessionSchema>;
export type WidgetMessageInput = z.infer<typeof widgetMessageSchema>;
export type TypingInput = z.infer<typeof typingSchema>;
