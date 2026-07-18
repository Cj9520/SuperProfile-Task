"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, MessageSquare, Mail, Search, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Contact = {
  id: string;
  name: string | null;
  email: string | null;
  source: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillContactId?: string;
}

export function NewConversationModal({ open, onClose, onCreated, prefillContactId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"contact" | "message">("contact");
  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [channel, setChannel] = useState<"chat" | "email">("chat");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Prefill contact if coming from ContactDrawer
  useEffect(() => {
    if (prefillContactId && open) {
      fetch(`/api/contacts/${prefillContactId}`).then((r) => {
        if (r.ok) r.json().then((d) => {
          setSelectedContact(d.contact);
          setStep("message");
        });
      });
    }
  }, [prefillContactId, open]);

  const searchContacts = useCallback(async (q: string) => {
    if (q.length < 2) { setContacts([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchContacts(contactSearch), 300);
    return () => clearTimeout(t);
  }, [contactSearch, searchContacts]);

  function reset() {
    setStep("contact");
    setContactSearch("");
    setContacts([]);
    setSelectedContact(null);
    setNewContactName("");
    setNewContactEmail("");
    setChannel("chat");
    setSubject("");
    setMessage("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { toast.error("Message is required"); return; }

    setSending(true);
    try {
      const body: Record<string, string> = {
        channel,
        firstMessage: message.trim(),
      };
      if (selectedContact) {
        body.contactId = selectedContact.id;
      } else {
        if (!newContactName && !newContactEmail) {
          toast.error("Enter at least a contact name or email");
          setSending(false);
          return;
        }
        if (newContactName) body.contactName = newContactName;
        if (newContactEmail) body.contactEmail = newContactEmail;
      }
      if (subject.trim()) body.subject = subject.trim();

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create conversation");
        return;
      }
      toast.success("Conversation started!");
      onCreated();
      handleClose();
      // Navigate to the new conversation
      router.push(`/inbox?c=${data.conversation.id}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">New Conversation</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          {/* Contact selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contact
            </label>

            {selectedContact ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(selectedContact.name || selectedContact.email || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedContact.name || "Unnamed"}
                  </p>
                  {selectedContact.email && (
                    <p className="text-xs text-muted-foreground truncate">{selectedContact.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedContact(null); setStep("contact"); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search existing */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Search existing contacts…"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Results */}
                {contacts.length > 0 && (
                  <div className="border rounded-xl overflow-hidden divide-y max-h-40 overflow-y-auto">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedContact(c); setContacts([]); setContactSearch(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(c.name || c.email || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.name || "Unnamed"}</p>
                          {c.email && <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Or create new */}
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    — or enter new contact details —
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Channel + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel</label>
              <div className="flex gap-1">
                {(["chat", "email"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border transition-all",
                      channel === ch
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {ch === "chat" ? <MessageSquare className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                    {ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Subject <span className="normal-case font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Follow-up on order"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">First Message</label>
            <textarea
              placeholder="Type your first message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-9 text-sm" disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Start Conversation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
