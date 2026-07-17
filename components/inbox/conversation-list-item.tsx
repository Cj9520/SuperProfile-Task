"use client";

import { cn, formatRelativeTime, truncate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, ChannelBadge } from "@/components/ui/badges";

type Conversation = {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  lastMessageAt: string | null;
  contact: { id: string; name: string | null; email: string | null };
  assignee?: {
    user: { id: string; name: string; avatarUrl: string | null };
  } | null;
  messages: Array<{ bodyText: string; createdAt: string; senderType: string }>;
  _count: { messages: number };
};

interface ConversationListItemProps {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  conversation: c,
  selected,
  onClick,
}: ConversationListItemProps) {
  const contact = c.contact;
  const displayName = contact.name || contact.email || "Visitor";
  const lastMessage = c.messages[0];
  const initials = getInitials(displayName);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 flex items-start gap-3 transition-colors border-b border-border/50",
        selected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : "hover:bg-muted/50"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span
            className={cn(
              "text-sm truncate",
              c.status === "open" ? "font-semibold" : "font-medium text-muted-foreground"
            )}
          >
            {displayName}
          </span>
          {c.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
              {formatRelativeTime(c.lastMessageAt)}
            </span>
          )}
        </div>

        {c.subject && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {c.subject}
          </p>
        )}

        {lastMessage && (
          <p className="text-xs text-muted-foreground/80 truncate">
            {lastMessage.senderType === "agent" ? "You: " : ""}
            {truncate(lastMessage.bodyText, 60)}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1.5">
          <ChannelBadge channel={c.channel as "chat" | "email"} />
          <StatusBadge status={c.status as "open" | "snoozed" | "resolved"} />
          {c.assignee && (
            <Avatar className="h-4 w-4 ml-auto">
              {c.assignee.user.avatarUrl && (
                <AvatarImage src={c.assignee.user.avatarUrl} />
              )}
              <AvatarFallback className="text-[8px]">
                {getInitials(c.assignee.user.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </button>
  );
}
