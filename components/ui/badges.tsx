import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "open" | "snoozed" | "resolved";
  className?: string;
};

const statusConfig = {
  open: {
    label: "Open",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  },
  snoozed: {
    label: "Snoozed",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  },
  resolved: {
    label: "Resolved",
    className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "open" && "bg-emerald-500",
          status === "snoozed" && "bg-amber-500",
          status === "resolved" && "bg-slate-400"
        )}
      />
      {config.label}
    </span>
  );
}

type ChannelBadgeProps = {
  channel: "chat" | "email";
  className?: string;
};

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
        channel === "chat"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
          : "bg-stone-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500",
        className
      )}
    >
      {channel === "chat" ? "💬" : "✉️"}
      {channel === "chat" ? "Chat" : "Email"}
    </span>
  );
}

type RoleBadgeProps = {
  role: "admin" | "agent";
  className?: string;
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        role === "admin"
          ? "bg-stone-200 text-zinc-800 dark:bg-zinc-900 dark:text-gold"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        className
      )}
    >
      {role === "admin" ? "Admin" : "Agent"}
    </span>
  );
}
