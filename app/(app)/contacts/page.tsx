"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Mail,
  Globe,
  Clock,
  ChevronRight,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { AddContactModal } from "@/components/contacts/add-contact-modal";
import { ContactDrawer } from "@/components/contacts/contact-drawer";

type Contact = {
  id: string;
  name: string | null;
  email: string | null;
  source: string;
  lastSeenAt: string | null;
  createdAt: string;
  _count: { conversations: number };
};

const SOURCE_FILTERS = [
  { value: "", label: "All sources" },
  { value: "chat", label: "Chat" },
  { value: "email", label: "Email" },
  { value: "api", label: "API" },
];

const SOURCE_COLORS: Record<string, string> = {
  chat: "bg-blue-100 text-blue-700",
  email: "bg-stone-200 text-zinc-500",
  api: "bg-orange-100 text-orange-700",
  default: "bg-gray-100 text-gray-600",
};

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAddContact, setShowAddContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search.length >= 2) params.set("search", search);
    if (sourceFilter) params.set("source", sourceFilter);

    const res = await fetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, sourceFilter, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchContacts, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [fetchContacts, search]);

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="text-base font-semibold">Contacts</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {total.toLocaleString()} total contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => setShowAddContact(true)}
            >
              <Filter className="w-3.5 h-3.5" />
              Add Contact
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={fetchContacts}
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
              id="contacts-search"
            />
          </div>

          <div className="flex items-center gap-1">
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSourceFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  sourceFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gold" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No contacts match your search" : "No contacts yet"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Contacts are created automatically when customers chat or email.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground sticky top-0">
                <th className="text-left px-6 py-2.5 font-medium">Contact</th>
                <th className="text-left px-4 py-2.5 font-medium">Source</th>
                <th className="text-left px-4 py-2.5 font-medium">Conversations</th>
                <th className="text-left px-4 py-2.5 font-medium">Last seen</th>
                <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const displayName =
                  contact.name || contact.email || "Anonymous";
                const sourceColor =
                  SOURCE_COLORS[contact.source] || SOURCE_COLORS.default;

                return (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className="border-b hover:bg-muted/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {displayName}
                          </p>
                          {contact.email && contact.name && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              {contact.email}
                            </p>
                          )}
                          {!contact.name && !contact.email && (
                            <p className="text-xs text-muted-foreground/60">
                              No contact info
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          sourceColor
                        )}
                      >
                        {contact.source === "chat" ? (
                          <MessageSquare className="w-3 h-3" />
                        ) : contact.source === "email" ? (
                          <Mail className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        {contact.source}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {contact._count.conversations}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {contact.lastSeenAt
                          ? formatRelativeTime(contact.lastSeenAt)
                          : "Never"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(contact.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    </td>

                     <td className="px-4 py-3">
                       <Button
                         size="icon"
                         variant="ghost"
                         className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                         onClick={(e) => { e.stopPropagation(); setSelectedContactId(contact.id); }}
                       >
                         <ChevronRight className="w-4 h-4" />
                       </Button>
                     </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      {/* Pagination */}
        {total > 40 && !loading && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-background">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 40 + 1}–{Math.min(page * 40, total)} of{" "}
              {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page * 40 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        onCreated={fetchContacts}
      />

      {/* Contact Drawer */}
      <ContactDrawer
        contactId={selectedContactId}
        onClose={() => setSelectedContactId(null)}
        onStartConversation={(id) => {
          setSelectedContactId(null);
          router.push(`/inbox?newConv=1&contactId=${id}`);
        }}
        onOpenConversation={(convId) => {
          setSelectedContactId(null);
          router.push(`/inbox?c=${convId}`);
        }}
      />
    </div>
  );
}
