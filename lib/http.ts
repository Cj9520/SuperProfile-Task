// Shared HTTP helpers used by every API route (controller layer).
// Feature services throw `ApiError`; route handlers wrap calls in
// `handleApiError` to translate them into consistent JSON responses.

import type { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function apiSuccess(data: unknown, status = 200) {
  return Response.json(data, { status });
}

/**
 * Turn a ZodError into a 422 with a human-readable message and a
 * `details` array of { field, message } pairs the client can render inline.
 */
export function apiValidationError(error: ZodError) {
  const details = error.errors.map((issue) => ({
    field: issue.path.join(".") || "request",
    message: issue.message,
  }));
  const first = details[0];
  const message =
    first.field === "request"
      ? first.message
      : `${humanizeField(first.field)}: ${first.message}`;
  return Response.json(
    { error: message, details },
    { status: 422 }
  );
}

function humanizeField(field: string): string {
  const withSpaces = field.replace(/([A-Z])/g, " $1").toLowerCase();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Translate a thrown value into a Response. Known `ApiError`s map to their
 * status; anything else is logged and returned as a 500 so internals never leak.
 */
export function handleApiError(err: unknown, tag = "api") {
  if (err instanceof ApiError) {
    return apiError(err.message, err.status);
  }
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") {
      return apiError("Authentication required", 401);
    }
    if (err.message === "FORBIDDEN") {
      return apiError("You do not have permission to perform this action", 403);
    }
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint violation — the one Prisma error safe to
    // surface as a client mistake rather than a server fault.
    if (err.code === "P2002") {
      return apiError("A record with this value already exists", 409);
    }
  }
  console.error(`[${tag}]`, err);
  return apiError(
    "Something went wrong on our end. Please try again later.",
    500
  );
}
