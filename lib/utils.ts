import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

/**
 * Read the `{ error }` body of a failed API response and pick a message,
 * falling back per status code when the body is missing or not JSON.
 */
export async function apiErrorMessage(res: Response): Promise<string> {
  let serverMessage: string | undefined;
  try {
    const body = await res.json();
    if (typeof body?.error === "string") serverMessage = body.error;
  } catch {
    // Non-JSON body (e.g. platform error page) — use the status fallback.
  }
  if (serverMessage) return serverMessage;

  switch (res.status) {
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 429:
      return "Too many attempts. Please wait a few minutes and try again.";
    default:
      return "Something went wrong on our end. Please try again.";
  }
}

// Strip HTML tags to get plain text (used for search indexing).
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
