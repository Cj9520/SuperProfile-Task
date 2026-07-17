import { NextRequest } from "next/server";
import { apiError, apiSuccess, handleApiError } from "@/lib/http";
import { acceptInviteSchema } from "@/features/auth/validation";
import { acceptInvite } from "@/features/auth/service";

export async function POST(req: NextRequest) {
  try {
    const data = acceptInviteSchema.safeParse(await req.json());
    if (!data.success) return apiError(data.error.errors[0].message, 422);

    return apiSuccess(await acceptInvite(data.data));
  } catch (err) {
    return handleApiError(err, "invite:accept");
  }
}
