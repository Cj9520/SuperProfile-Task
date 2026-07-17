"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  FileText,
  Lock,
  MoreHorizontal,
  CheckCheck,
  Clock,
  Bot,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, ChannelBadge } from "@/components/ui/badges";
import {
  cn,
  formatDateTime,
  formatRelativeTime,
  getInitials,
} from "@/lib/utils";
import {
  getPusherClient,
  conversationChannel,
  PUSHER_EVENTS,
} from "@/lib/pusher";
import toast from "react-hot-toast";

type Message = {
  id: string;
  senderType: string;
  bodyText: string;
  bodyHtml?: string | null;
  channel: string;
  direction: string;
  deliveryStatus: string;
  readAt?: string | null;
  createdAt: string;
  senderUser?: { id: string; name: string; avatarUrl?: string | null } | null;
};

type ConversationDetail = {
  id: string;
  channel: string;
  status: string;
  subject?: string | null;
  contact: { name?: string | null; email?: string | null };
  assignee?: { user: { name: string; avatarUrl?: string | null } } | null;
  messages: Message[];
  aiSummary?: {
    summaryText: string;
    userNeed?: string | null;
    currentStatus?: string | null;
    lastGeneratedAt: string;
  } | null;
  _count: { messages: number };
};

export function ConversationThread({
  conversationId,
  onUpdate,
}: {
  conversationId: string;
  onUpdate?: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversation = useCallback(async () => {
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.ok) {
      const data = await res.json();
      setConversation(data.conversation);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    fetchConversation();
  }, [conversationId, fetchConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  // Real-time
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(conversationChannel(conversationId));

    channel.bind(PUSHER_EVENTS.NEW_MESSAGE, () => {
      fetchConversation();
    });
    channel.bind(PUSHER_EVENTS.TYPING_START, (data: { source: string }) => {
      if (data.source === "customer") setCustomerTyping(true);
    });
    channel.bind(PUSHER_EVENTS.TYPING_STOP, (data: { source: string }) => {
      if (data.source === "customer") setCustomerTyping(false);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(conversationChannel(conversationId));
    };
  }, [conversationId, fetchConversation]);

  async function handleSend() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodyText: reply.trim(),
          channel: noteMode ? "internal_note" : conversation?.channel || "chat",
        }),
      });
      if (res.ok) {
        setReply("");
        fetchConversation();
        onUpdate?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: string) {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchConversation();
      onUpdate?.();
      toast.success(
        status === "resolved" ? "Conversation resolved ✓" : `Status: ${status}`
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const contact = conversation.contact;
  const displayName = contact.name || contact.email || "Visitor";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{displayName}</h2>
            {contact.email && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <ChannelBadge channel={conversation.channel as "chat" | "email"} />
            <StatusBadge status={conversation.status as "open" | "snoozed" | "resolved"} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {conversation.status !== "resolved" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus("resolved")}
              className="text-xs h-7"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Resolve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus("open")}
              className="text-xs h-7"
            >
              Reopen
            </Button>
          )}
          {conversation.status === "open" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus("snoozed")}
              className="text-xs h-7"
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              Snooze
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {conversation.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {customerTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-secondary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="message-customer px-4 py-3 max-w-[200px]">
              <div className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse-dot"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse-dot"
                  style={{ animationDelay: "160ms" }}
                />
                <span
                  className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse-dot"
                  style={{ animationDelay: "320ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background p-3">
        {/* Mode tabs */}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => setNoteMode(false)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              !noteMode
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Send className="w-3 h-3" />
            Reply
          </button>
          <button
            onClick={() => setNoteMode(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              noteMode
                ? "bg-amber-100 text-amber-700"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Lock className="w-3 h-3" />
            Internal note
          </button>
        </div>

        <div
          className={cn(
            "rounded-xl border transition-colors",
            noteMode ? "border-amber-300 bg-amber-50/50" : "border-input"
          )}
        >
          <Textarea
            placeholder={
              noteMode
                ? "Add an internal note (only visible to team)…"
                : `Reply to ${displayName}…`
            }
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSend();
              }
            }}
            className={cn(
              "border-0 shadow-none focus-visible:ring-0 resize-none",
              noteMode && "bg-transparent placeholder:text-amber-500/60"
            )}
            rows={3}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-inherit">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">
                ⌘ Enter
              </kbd>{" "}
              to send
            </p>
            <Button
              size="sm"
              variant={noteMode ? "outline" : "default"}
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className={cn(
                "h-7 text-xs",
                noteMode && "border-amber-300 text-amber-700 hover:bg-amber-100"
              )}
            >
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  {noteMode ? (
                    <Lock className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-1" />
                  )}
                  {noteMode ? "Add note" : "Send"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message: msg }: { message: Message }) {
  const isAgent = msg.senderType === "agent";
  const isInternal = msg.channel === "internal_note";
  const isCustomer = msg.senderType === "customer";

  if (isInternal) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="message-internal px-4 py-3 max-w-[80%] w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3 h-3 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">
              Internal note · {msg.senderUser?.name || "Agent"}
            </span>
            <span className="text-xs text-amber-500/60 ml-auto">
              {formatRelativeTime(msg.createdAt)}
            </span>
          </div>
          <p className="text-sm">{msg.bodyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-fade-in",
        isAgent ? "justify-end" : "justify-start"
      )}
    >
      {!isAgent && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs bg-secondary">V</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "max-w-[70%] px-4 py-3",
          isAgent ? "message-agent" : "message-customer"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {msg.bodyText}
        </p>
        <p
          className={cn(
            "text-[10px] mt-1.5",
            isAgent ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatRelativeTime(msg.createdAt)}
          {isAgent &&
            msg.deliveryStatus === "delivered" && (
              <CheckCheck className="inline w-3 h-3 ml-1 text-primary-foreground/60" />
            )}
        </p>
      </div>

      {isAgent && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(msg.senderUser?.name || "A")}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
