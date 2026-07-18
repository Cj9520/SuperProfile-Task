"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  Lock,
  CheckCheck,
  Clock,
  Bot,
  Sparkles,
  ChevronDown,
  AlertCircle,
  ArrowDown,
  Minus,
  ArrowUp,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, ChannelBadge } from "@/components/ui/badges";
import {
  cn,
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
  priority: string;
  subject?: string | null;
  contact: { name?: string | null; email?: string | null };
  assignee?: { user: { name: string; avatarUrl?: string | null } } | null;
  messages: Message[];
  _count: { messages: number };
};

const SNOOZE_OPTIONS = [
  { label: "1 hour", hours: 1 },
  { label: "4 hours", hours: 4 },
  { label: "Tomorrow 9am", hours: 16 },
  { label: "Next week", hours: 168 },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", icon: ArrowDown, color: "text-blue-500" },
  { value: "normal", label: "Normal", icon: Minus, color: "text-gray-500" },
  { value: "high", label: "High", icon: ArrowUp, color: "text-red-500" },
];

export function ConversationThread({
  conversationId,
  onUpdate,
  onBack,
}: {
  conversationId: string;
  onUpdate?: () => void;
  onBack?: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
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
    setReply("");
    setNoteMode(false);
    fetchConversation();
    // Mark conversation as read (fire-and-forget → triggers Pusher read receipt to widget)
    fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
  }, [conversationId, fetchConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  // Real-time
  useEffect(() => {
    let pusher: ReturnType<typeof getPusherClient>;
    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]>;
    try {
      pusher = getPusherClient();
      channel = pusher.subscribe(conversationChannel(conversationId));
      channel.bind(PUSHER_EVENTS.NEW_MESSAGE, () => { fetchConversation(); });
      channel.bind(PUSHER_EVENTS.TYPING_START, (data: { source: string }) => {
        if (data.source === "customer") {
          setCustomerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setCustomerTyping(false), 5000);
        }
      });
      channel.bind(PUSHER_EVENTS.TYPING_STOP, (data: { source: string }) => {
        if (data.source === "customer") setCustomerTyping(false);
      });
    } catch {
      // Pusher not configured
    }
    return () => {
      try {
        channel?.unbind_all();
        pusher?.unsubscribe(conversationChannel(conversationId));
      } catch {}
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
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: string, extra?: Record<string, unknown>) {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });
    if (res.ok) {
      fetchConversation();
      onUpdate?.();
      if (status === "resolved") toast.success("Conversation resolved ✓");
      else if (status === "snoozed") toast.success("Snoozed ⏰");
      else toast.success(`Status: ${status}`);
    }
    setShowSnooze(false);
  }

  async function updatePriority(priority: string) {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    if (res.ok) {
      fetchConversation();
      onUpdate?.();
    }
    setShowPriority(false);
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
        <p className="text-muted-foreground text-sm">Conversation not found</p>
      </div>
    );
  }

  const contact = conversation.contact;
  const displayName = contact.name || contact.email || "Visitor";
  const currentPriority = PRIORITY_OPTIONS.find(
    (p) => p.value === (conversation.priority || "normal")
  ) || PRIORITY_OPTIONS[1];
  const PriorityIcon = currentPriority.icon;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background min-w-0">

        {/* Back button — mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Back to list"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate leading-tight">{displayName}</p>
          {contact.email && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{contact.email}</p>
          )}
        </div>

        {/* ── Chip row — all share the same base style ── */}
        {/* Base chip: h-7 px-2.5 rounded-md text-xs font-medium border border-border */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">

          {/* Channel chip — info only */}
          <span className={cn(
            "hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap",
            conversation.channel === "chat"
              ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400"
              : "border-border bg-muted/60 text-muted-foreground"
          )}>
            {conversation.channel === "chat" ? "💬" : "✉️"}
            <span className="hidden md:inline">
              {conversation.channel === "chat" ? "Chat" : "Email"}
            </span>
          </span>

          {/* Status chip — info only */}
          <span className={cn(
            "hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap",
            conversation.status === "open"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : conversation.status === "snoozed"
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              conversation.status === "open" ? "bg-emerald-500" :
              conversation.status === "snoozed" ? "bg-amber-500" : "bg-slate-400"
            )} />
            <span className="hidden md:inline capitalize">{conversation.status}</span>
          </span>

          {/* Separator */}
          <div className="hidden sm:block w-px h-4 bg-border shrink-0" />

          {/* Priority chip — interactive */}
          <div className="relative">
            <button
              onClick={() => setShowPriority(!showPriority)}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors",
                currentPriority.value === "high"
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                  : currentPriority.value === "low"
                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              <PriorityIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline capitalize">{currentPriority.label}</span>
            </button>

            {showPriority && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPriority(false)} />
                <div className="absolute top-full mt-1.5 right-0 bg-popover border border-border rounded-xl shadow-2xl z-[100] w-36 overflow-hidden py-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-1.5">Priority</p>
                  {PRIORITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = conversation.priority === opt.value || (!conversation.priority && opt.value === "normal");
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updatePriority(opt.value)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                          active && "bg-muted font-medium"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", opt.color)} />
                        {opt.label}
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Resolve / Reopen chip — interactive */}
          {conversation.status !== "resolved" ? (
            <button
              onClick={() => updateStatus("resolved")}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Resolve</span>
            </button>
          ) : (
            <button
              onClick={() => updateStatus("open")}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors border-border bg-background text-muted-foreground hover:bg-muted"
            >
              <span className="hidden sm:inline">Reopen</span>
              <span className="sm:hidden">↩</span>
            </button>
          )}

          {/* Snooze chip — interactive dropdown */}
          {conversation.status === "open" && (
            <div className="relative">
              <button
                onClick={() => setShowSnooze(!showSnooze)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border whitespace-nowrap transition-colors border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Snooze</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", showSnooze && "rotate-180")} />
              </button>

              {showSnooze && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSnooze(false)} />
                  <div className="absolute top-full mt-1.5 right-0 bg-popover border border-border rounded-xl shadow-2xl z-[100] w-48 overflow-hidden py-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-1.5">Snooze until</p>
                    {SNOOZE_OPTIONS.map((opt) => {
                      const snoozedUntil = new Date();
                      snoozedUntil.setHours(snoozedUntil.getHours() + opt.hours);
                      return (
                        <button
                          key={opt.label}
                          onClick={() => updateStatus("snoozed", { snoozedUntil: snoozedUntil.toISOString() })}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {snoozedUntil.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {conversation.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {customerTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-secondary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="message-customer px-4 py-3">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse-dot"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t bg-background p-3">
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => setNoteMode(false)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              !noteMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Send className="w-3 h-3" />
            Reply
          </button>
          <button
            onClick={() => setNoteMode(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              noteMode ? "bg-amber-100 text-amber-700" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Lock className="w-3 h-3" />
            Note
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
                ? "Add an internal note…"
                : `Reply to ${displayName}…`
            }
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            className={cn(
              "border-0 shadow-none focus-visible:ring-0 resize-none",
              noteMode && "bg-transparent placeholder:text-amber-500/60"
            )}
            rows={3}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-inherit">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">⌘ Enter</kbd> to send
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
                  {noteMode ? <Lock className="w-3.5 h-3.5 mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
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

  if (isInternal) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="message-internal px-4 py-3 max-w-[85%] w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3 h-3 text-amber-500" />
            <span className="text-xs font-medium text-amber-700">
              Note · {msg.senderUser?.name || "Agent"}
            </span>
            <span className="text-xs text-amber-500/60 ml-auto">
              {formatRelativeTime(msg.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{msg.bodyText}</p>
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.bodyText}</p>
        <p
          className={cn(
            "text-[10px] mt-1.5",
            isAgent ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatRelativeTime(msg.createdAt)}
          {isAgent && msg.deliveryStatus === "delivered" && (
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
