"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Workspace created! Welcome aboard 🎉");
        router.push("/inbox");
      } else {
        toast.error(data.error || "Signup failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex gradient-bg">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -right-1/4 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-1/4 -left-1/4 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 shadow-xl">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">SuperProfile</span>
        </div>

        <div className="relative">
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Start delivering
            <br />
            <span className="text-indigo-300">exceptional</span>
            <br />
            support today.
          </h1>
          <p className="text-indigo-200 text-lg">
            One workspace. Live chat, email, knowledge base, and AI — all in
            one place.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Embeddable chat widget in 1 script tag",
              "Unified inbox for chat + email",
              "AI-powered conversation summaries",
              "Team collaboration & role management",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-indigo-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300/50 text-sm relative">
          SuperProfile · Customer Communication Platform
        </p>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-8 rounded-l-3xl">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">SuperProfile</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Create your workspace</h2>
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="name">
                  Full name
                </label>
                <Input
                  id="name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label
                  className="text-sm font-medium mb-1.5 block"
                  htmlFor="workspaceName"
                >
                  Workspace name
                </label>
                <Input
                  id="workspaceName"
                  placeholder="Acme Corp Support"
                  value={form.workspaceName}
                  onChange={(e) =>
                    setForm({ ...form, workspaceName: e.target.value })
                  }
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="email">
                Work email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label
                className="text-sm font-medium mb-1.5 block"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              size="lg"
              disabled={loading}
              id="signup-submit"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create workspace
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
