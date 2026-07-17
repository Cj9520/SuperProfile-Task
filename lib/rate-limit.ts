// Simple in-memory rate limiter (resets on restart, per-instance only).
// NOTE: on multi-instance serverless (Vercel) this is best-effort. Swap the
// backing store for Redis / @vercel/kv for a distributed limit in production.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
