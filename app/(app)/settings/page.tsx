import { getSession, getCurrentUser, getCurrentWorkspace } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings, Code, Copy, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/db";

export const metadata = { title: "Settings — SuperProfile" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, workspace] = await Promise.all([
    getCurrentUser(session),
    getCurrentWorkspace(session),
  ]);
  if (!user || !workspace) redirect("/login");

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const embedCode = `<script src="${appUrl}/widget-loader.js" data-widget-token="${workspace.widgetToken}"></script>`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Workspace configuration and integration settings
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl space-y-8">
          {/* Workspace info */}
          <section>
            <h2 className="text-sm font-semibold mb-4">Workspace</h2>
            <div className="border rounded-xl overflow-hidden">
              {[
                { label: "Name", value: workspace.name },
                { label: "Slug", value: workspace.slug },
                {
                  label: "Support Email",
                  value: workspace.supportEmail || "—",
                },
                { label: "Widget Token", value: workspace.widgetToken },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                >
                  <span className="text-sm text-muted-foreground w-36 shrink-0">
                    {row.label}
                  </span>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded flex-1 truncate">
                    {row.value}
                  </code>
                </div>
              ))}
            </div>
          </section>

          {/* Widget embed */}
          <section>
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Code className="w-4 h-4" />
              Widget Embed Code
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Copy this script tag and add it before the closing{" "}
              <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code>{" "}
              tag on your website.
            </p>
            <div className="bg-slate-900 rounded-xl p-4 relative">
              <code className="text-emerald-400 text-sm leading-relaxed block font-mono break-all">
                {embedCode}
              </code>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href="/widget-demo"
                target="_blank"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                View live demo
              </a>
              <a
                href={`/help?workspaceId=${workspace.id}`}
                target="_blank"
                className="text-primary hover:underline"
              >
                View public KB →
              </a>
            </div>
          </section>

          {/* User profile */}
          <section>
            <h2 className="text-sm font-semibold mb-4">Your Profile</h2>
            <div className="border rounded-xl overflow-hidden">
              {[
                { label: "Name", value: user.name },
                { label: "Email", value: user.email },
                { label: "Role", value: session.role },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                >
                  <span className="text-sm text-muted-foreground w-36 shrink-0">
                    {row.label}
                  </span>
                  <span className="text-sm capitalize">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
