import { deleteSession } from "@/lib/auth";
import { apiSuccess } from "@/lib/utils";

export async function POST() {
  await deleteSession();
  return apiSuccess({ message: "Logged out successfully" });
}
