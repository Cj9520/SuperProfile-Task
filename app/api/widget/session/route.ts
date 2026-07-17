import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { sessionSchema } from "@/features/widget/validation";
import { createOrRecoverSession } from "@/features/widget/service";

export async function POST(req: NextRequest) {
  try {
    const data = sessionSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    const { data: payload, status } = await createOrRecoverSession(data.data);
    return apiSuccess(payload, status);
  } catch (err) {
    return handleApiError(err, "widget:session");
  }
}
