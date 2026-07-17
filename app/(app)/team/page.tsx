"use client";

import { useState, useEffect } from "react";
import { Users, Mail, UserPlus, Shield, Loader2, Trash2, MoreHorizontal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badges";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import toast from "react-hot-toast";

type Member = {
  id: string;
  role: string;
  inviteStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    lastLoginAt?: string | null;
  };
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "agent">("agent");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const res = await fetch("/api/team/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        // Show invite link for testing without email
        if (data.inviteToken) {
          const link = `${window.location.origin}/invite/accept?token=${data.inviteToken}`;
          setInviteLink(link);
        }
        fetchMembers();
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(id: string, role: "admin" | "agent") {
    const res = await fetch(`/api/team/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.success("Role updated");
      fetchMembers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update role");
    }
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Member removed");
      fetchMembers();
    }
  }

  const accepted = members.filter((m) => m.inviteStatus === "accepted");
  const pending = members.filter((m) => m.inviteStatus === "pending");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-base font-semibold">Team</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage workspace members and their roles
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl space-y-8">
          {/* Invite section */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite team member
            </h2>
            <form onSubmit={sendInvite} className="flex items-center gap-3">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1"
                id="invite-email"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "agent")}
                className="h-9 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                id="invite-role"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" disabled={inviting} id="send-invite">
                {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Send invite
              </Button>
            </form>

            {inviteLink && (
              <div className="mt-3 p-3 bg-muted rounded-xl">
                <p className="text-xs text-muted-foreground mb-1.5">
                  📋 Invite link (copy for testing without email):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background px-2.5 py-1.5 rounded-md border truncate">
                    {inviteLink}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Active members */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Members ({accepted.length})
            </h2>
            <div className="border rounded-xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                accepted.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t" : ""}`}
                  >
                    <Avatar className="h-9 w-9">
                      {m.user.avatarUrl && <AvatarImage src={m.user.avatarUrl} />}
                      <AvatarFallback className="text-xs">
                        {getInitials(m.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.user.name}</p>
                        {m.role === "admin" && (
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.user.email}
                        {m.user.lastLoginAt && (
                          <span className="ml-2 text-muted-foreground/50">
                            · Last seen {formatRelativeTime(m.user.lastLoginAt)}
                          </span>
                        )}
                      </p>
                    </div>
                    <RoleBadge role={m.role as "admin" | "agent"} />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateRole(
                            m.id,
                            m.role === "admin" ? "agent" : "admin"
                          )
                        }
                      >
                        {m.role === "admin" ? "Make agent" : "Make admin"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeMember(m.id, m.user.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending invites */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Pending invitations ({pending.length})
              </h2>
              <div className="border rounded-xl overflow-hidden">
                {pending.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t" : ""} bg-muted/30`}
                  >
                    <div className="w-9 h-9 rounded-full bg-muted border-2 border-dashed flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Pending invitation
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Sent {formatRelativeTime(m.createdAt)}
                      </p>
                    </div>
                    <RoleBadge role={m.role as "admin" | "agent"} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMember(m.id, "pending invite")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
