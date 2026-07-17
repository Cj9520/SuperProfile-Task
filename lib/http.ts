// Shared HTTP helpers used by every API route (controller layer).
// Feature services throw `ApiError`; route handlers wrap calls in
// `handleApiError` to translate them into consistent JSON responses.

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
 * Translate a thrown value into a Response. Known `ApiError`s map to their
 * status; anything else is logged and returned as a 500 so internals never leak.
 */
export function handleApiError(err: unknown, tag = "api") {
  if (err instanceof ApiError) {
    return apiError(err.message, err.status);
  }
  console.error(`[${tag}]`, err);
  return apiError("Internal server error", 500);
}
