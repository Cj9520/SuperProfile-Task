"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return toast.error("Invalid invite link");
    setLoading(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Welcome to the team! 🎉");
        router.push("/inbox");
      } else {
        toast.error(data.error || "Failed to accept invite");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="bg-background rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <p className="text-lg font-semibold mb-2">Invalid invite link</p>
          <p className="text-muted-foreground text-sm">
            This invite link is missing or invalid.
          </p>
          <Link href="/login" className="text-primary text-sm mt-4 block hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl">SuperProfile</span>
          </div>

          <h1 className="text-2xl font-bold mb-1">Accept your invitation</h1>
          <p className="text-muted-foreground text-sm mb-7">
            You&apos;ve been invited to join a workspace. Set up your account to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-name">
                Your name
              </label>
              <Input
                id="invite-name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="invite-password">
                Choose a password
              </label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={loading}
              id="accept-invite-submit"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Accept &amp; join workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gradient-bg">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
