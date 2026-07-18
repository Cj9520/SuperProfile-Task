"use client";

import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddContactModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() && !email.trim()) {
      toast.error("Enter at least a name or email");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email: email.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create contact");
        return;
      }
      toast.success("Contact added");
      setName("");
      setEmail("");
      onCreated();
      onClose();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Add New Contact</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="add-contact-name" className="text-xs font-medium">Full Name</label>
            <Input
              id="add-contact-name"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="add-contact-email" className="text-xs font-medium">Email Address</label>
            <Input
              id="add-contact-email"
              type="email"
              placeholder="e.g. jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            At least a name or email is required. This contact will be marked as <strong>imported</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-9 text-sm" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
