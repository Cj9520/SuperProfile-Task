"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  Search,
  Filter,
  MessageSquare,
  Mail,
  ChevronDown,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationListItem } from "@/components/inbox/conversation-list-item";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { ConversationSidebar } from "@/components/inbox/conversation-sidebar";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getPusherClient, workspaceChannel, PUSHER_EVENTS } from "@/lib/pusher";

type Conversation = {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  assigneeMemberId: string | null;
  lastMessageAt: string | null;
  contact: { id: string; name: string | null; email: string | null };
  assignee?: {
    user: { id: string; name: string; avatarUrl: string | null };
  } | null;
  messages: Array<{ bodyText: string; createdAt: string; senderType: string }>;
  _count: { messages: number };
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "resolved", label: "Resolved" },
];

const CHANNEL_FILTERS = [
  { value: "", label: "All channels" },
  { value: "chat", label: "Chat" },
  { value: "email", label: "Email" },
];

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("c") || null
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [channelFilter, setChannelFilter] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (channelFilter) params.set("channel", channelFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/conversations?${params}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
    setLoading(false);
  }, [statusFilter, channelFilter, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Get workspace ID for Pusher
  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (r.ok) r.json().then((d) => setWorkspaceId(d.workspace?.id || ""));
    });
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!workspaceId) return;
    let pusher: ReturnType<typeof getPusherClient> | null = null;
    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]> | null = null;
    try {
      pusher = getPusherClient();
      channel = pusher.subscribe(workspaceChannel(workspaceId));
      channel.bind(PUSHER_EVENTS.NEW_MESSAGE, () => { fetchConversations(); });
      channel.bind(PUSHER_EVENTS.CONVERSATION_UPDATED, () => { fetchConversations(); });
    } catch {
      // Pusher not configured — real-time disabled, polling not needed
    }
    return () => {
      try {
        channel?.unbind_all();
        if (pusher && workspaceId) pusher.unsubscribe(workspaceChannel(workspaceId));
      } catch {}
    };
  }, [workspaceId, fetchConversations]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Conversation list pane */}
      <div className="flex flex-col w-80 border-r bg-background shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-sm">Inbox</h1>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={fetchConversations}
            className="h-7 w-7"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          {CHANNEL_FILTERS.slice(1).map((f) => (
            <button
              key={f.value}
              onClick={() =>
                setChannelFilter(channelFilter === f.value ? "" : f.value)
              }
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                channelFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg shimmer"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <Inbox className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No conversations
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {search
                  ? "Try a different search term"
                  : "New conversations will appear here"}
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationListItem
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main thread pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId ? (
          <ConversationThread
            conversationId={selectedId}
            onUpdate={fetchConversations}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Choose a conversation from the list to view the full thread and
              reply to your customers.
            </p>
          </div>
        )}
      </div>

      {/* Right sidebar — only when conversation selected */}
      {selectedId && (
        <ConversationSidebar
          conversationId={selectedId}
          onUpdate={fetchConversations}
        />
      )}
    </div>
  );
}
