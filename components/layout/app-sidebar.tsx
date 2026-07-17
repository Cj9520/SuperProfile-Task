"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Inbox,
  BookOpen,
  Users,
  Settings,
  Globe,
  LogOut,
  Zap,
  Bell,
  Contact,
  BarChart2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/domains", label: "Domains", icon: Globe },
];

interface AppSidebarProps {
  user: { name: string; email: string; avatarUrl?: string | null };
  workspace: { name: string; slug: string };
}

export function AppSidebar({ user, workspace }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<
    { id: string; message: string; link: string; createdAt: string }[]
  >([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n })));
    } catch {}
    setShowNotif(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      toast.error("Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border relative">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">
            {workspace.name}
          </p>
          <p className="text-xs text-sidebar-foreground/50">SuperProfile</p>
        </div>

        {/* Notification bell */}
        <div className="ml-auto relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotif && (
            <div className="absolute top-6 right-0 w-72 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-semibold">Notifications</span>
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No notifications
                  </p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <Link
                      key={n.id}
                      href={n.link || "/inbox"}
                      onClick={() => setShowNotif(false)}
                      className="flex items-start gap-2 px-3 py-2.5 hover:bg-muted transition-colors border-b last:border-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="text-xs text-foreground leading-relaxed">
                        {n.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close notification dropdown on outside click */}
      {showNotif && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotif(false)}
        />
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent group transition-colors">
          <Avatar className="h-8 w-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="opacity-0 group-hover:opacity-100 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
