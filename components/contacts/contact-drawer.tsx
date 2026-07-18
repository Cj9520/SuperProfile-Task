"use client";

import { useState, useEffect, useCallback } from "react";
import { X, MessageSquare, Mail, Clock, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";

type ContactDetail = {
  id: string;
  name: string | null;
  email: string | null;
  source: string;
  lastSeenAt: string | null;
  createdAt: string;
  _count: { conversations: number };
  conversations: Array<{
    id: string;
    channel: string;
    status: string;
    subject: string | null;
    lastMessageAt: string | null;
    createdAt: string;
    _count: { messages: number };
    assignee?: { user: { id: string; name: string } } | null;
  }>;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  snoozed: "bg-amber-100 text-amber-700",
  resolved: "bg-stone-100 text-stone-500",
};

interface Props {
  contactId: string | null;
  onClose: () => void;
  onStartConversation: (contactId: string) => void;
  onOpenConversation: (conversationId: string) => void;
}

export function ContactDrawer({ contactId, onClose, onStartConversation, onOpenConversation }: Props) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setContact(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setContact(data.contact);
      }
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  if (!contactId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-96 bg-background border-l shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-semibold text-sm">Contact Details</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !contact ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Failed to load contact
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Contact card */}
            <div className="p-5 border-b">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-base">
                    {getInitials(contact.name || contact.email || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {contact.name || "Anonymous"}
                  </p>
                  {contact.email && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Source</p>
                  <p className="font-medium capitalize">{contact.source}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Conversations</p>
                  <p className="font-medium">{contact._count.conversations}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-muted-foreground mb-0.5">Joined</p>
                  <p className="font-medium">{formatRelativeTime(contact.createdAt)}</p>
                </div>
                {contact.lastSeenAt && (
                  <div className="bg-muted/50 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-0.5">Last seen</p>
                    <p className="font-medium">{formatRelativeTime(contact.lastSeenAt)}</p>
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-4 h-9 text-sm gap-2"
                onClick={() => onStartConversation(contact.id)}
              >
                <MessageSquare className="w-4 h-4" />
                Start Conversation
              </Button>
            </div>

            {/* Conversation history */}
            <div className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Conversation History
              </p>

              {contact.conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onOpenConversation(conv.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 rounded-xl border hover:border-primary/30 hover:bg-muted/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {conv.channel === "email" ? (
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          ) : (
                            <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                          <p className="text-xs font-medium truncate">
                            {conv.subject || "Chat conversation"}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                            STATUS_COLORS[conv.status] || STATUS_COLORS.open
                          )}
                        >
                          {conv.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {conv._count.messages} messages
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
