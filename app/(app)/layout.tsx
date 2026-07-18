import { redirect } from "next/navigation";
import { getSession, getCurrentUser, getCurrentWorkspace } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, workspace] = await Promise.all([
    getCurrentUser(session),
    getCurrentWorkspace(session),
  ]);

  if (!user || !workspace) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
        workspace={{ name: workspace.name, slug: workspace.slug }}
      />
      <main className="flex-1 overflow-auto min-w-0 pt-12 lg:pt-0">{children}</main>
    </div>
  );
}
