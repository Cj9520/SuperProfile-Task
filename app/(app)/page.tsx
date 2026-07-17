import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AppRootPage() {
  const session = await getSession();
  if (session) {
    redirect("/inbox");
  }
  redirect("/");
}
