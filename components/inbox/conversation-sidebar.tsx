"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  User,
  RefreshCw,
  Loader2,
  ChevronDown,
  UserCheck,
  Mail,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatDateTime, formatRelativeTime, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";

type ConversationDetail = {
  id: string;
  channel: string;
  status: string;
  subject?: string | null;
  priority: string;
  createdAt: string;
  lastMessageAt?: string | null;
  contact: {
    id: string;
    name?: string | null;
    email?: string | null;
    source: string;
    lastSeenAt?: string | null;
  };
  assignee?: {
    id: string;
    user: { id: string; name: string; avatarUrl?: string | null };
  } | null;
  aiSummary?: {
    summaryText: string;
    userNeed?: string | null;
    attemptedActions?: string | null;
    currentStatus?: string | null;
    lastGeneratedAt: string;
    modelName?: string | null;
    sourceMessageCount: number;
  } | null;
  _count: { messages: number };
};

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; avatarUrl?: string | null };
};

export function ConversationSidebar({
  conversationId,
  onUpdate,
}: {
  conversationId: string;
  onUpdate?: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);

  const fetch_ = useCallback(async () => {
    const [convRes, membersRes] = await Promise.all([
      fetch(`/api/conversations/${conversationId}`),
      fetch("/api/team/members"),
    ]);
    if (convRes.ok) {
      const d = await convRes.json();
      setConversation(d.conversation);
    }
    if (membersRes.ok) {
      const d = await membersRes.json();
      setMembers(d.members || []);
    }
  }, [conversationId]);

  useEffect(() => {
    fetch_();
  }, [conversationId, fetch_]);

  async function assignTo(memberId: string | null) {
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeMemberId: memberId }),
    });
    if (res.ok) {
      fetch_();
      onUpdate?.();
      toast.success(memberId ? "Conversation assigned" : "Assignment removed");
      setShowAssignee(false);
    }
  }

  async function generateSummary() {
    setSummarizing(true);
    try {
      const res = await fetch(
        `/api/ai/conversations/${conversationId}`,
        { method: "POST" }
      );
      if (res.ok) {
        fetch_();
        toast.success("AI summary generated ✨");
      } else {
        const data = await res.json();
        toast.error(data.error || "Summary generation failed");
      }
    } catch {
      toast.error("Summary service unavailable");
    } finally {
      setSummarizing(false);
    }
  }

  if (!conversation) {
    return (
      <div className="w-72 border-l bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const contact = conversation.contact;

  return (
    <div className="w-72 border-l bg-background flex flex-col overflow-y-auto">
      {/* Contact info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getInitials(contact.name || contact.email || "V")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {contact.name || "Anonymous Visitor"}
            </p>
            {contact.email && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {contact.email}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-0.5">Source</p>
            <p className="capitalize">{contact.source}</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-0.5">Messages</p>
            <p>{conversation._count.messages}</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-0.5">Started</p>
            <p>{formatRelativeTime(conversation.createdAt)}</p>
          </div>
          {contact.lastSeenAt && (
            <div>
              <p className="font-medium text-foreground mb-0.5">Last seen</p>
              <p>{formatRelativeTime(contact.lastSeenAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Assignee
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={() => setShowAssignee(!showAssignee)}
          >
            Change
          </Button>
        </div>

        {conversation.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              {conversation.assignee.user.avatarUrl && (
                <AvatarImage src={conversation.assignee.user.avatarUrl} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(conversation.assignee.user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{conversation.assignee.user.name}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unassigned</p>
        )}

        {showAssignee && (
          <div className="mt-2 border rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => assignTo(null)}
              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              Remove assignment
            </button>
            {members
              .filter((m) => m.user && m.role !== "")
              .map((m) => (
                <button
                  key={m.id}
                  onClick={() => assignTo(m.id)}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors border-t"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(m.user?.name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{m.user?.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {m.role}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              AI Summary
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={generateSummary}
            disabled={summarizing}
          >
            {summarizing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>

        {conversation.aiSummary ? (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
              <p className="text-xs text-indigo-900 leading-relaxed">
                {conversation.aiSummary.summaryText}
              </p>
            </div>

            {conversation.aiSummary.userNeed && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  What they need
                </p>
                <p className="text-xs">{conversation.aiSummary.userNeed}</p>
              </div>
            )}

            {conversation.aiSummary.attemptedActions && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Tried so far
                </p>
                <p className="text-xs">{conversation.aiSummary.attemptedActions}</p>
              </div>
            )}

            {conversation.aiSummary.currentStatus && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Current status
                </p>
                <p className="text-xs">{conversation.aiSummary.currentStatus}</p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Generated {formatRelativeTime(conversation.aiSummary.lastGeneratedAt)} ·{" "}
              {conversation.aiSummary.sourceMessageCount} messages ·{" "}
              {conversation.aiSummary.modelName || "AI"}
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <Bot className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No summary yet.
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Click refresh to generate one (requires 2+ messages)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
