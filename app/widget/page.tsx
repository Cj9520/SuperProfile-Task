"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  BookOpen,
  Loader2,
  Search,
  MessageSquare,
  Minimize2,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import PusherClient from "pusher-js";

type Message = {
  id: string;
  senderType: string;
  bodyText: string;
  createdAt: string;
  senderUser?: { name: string; avatarUrl?: string | null } | null;
};

type KBArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
};

export default function WidgetPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [workspaceName, setWorkspaceName] = useState("Support");
  const [visitorToken, setVisitorToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [view, setView] = useState<"home" | "chat" | "search">("home");
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [responseTime, setResponseTime] = useState("We'll reply as soon as possible");
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);

  // Bootstrap widget config
  useEffect(() => {
    if (!token) return;
    fetch(`/api/widget/config/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.workspace) setWorkspaceName(d.workspace.name);
      })
      .catch(() => {});

    // Fetch real agent status
    fetch(`/api/widget/status?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        setIsAgentOnline(d.isOnline ?? false);
        if (d.responseTime) setResponseTime(d.responseTime);
      })
      .catch(() => {});

    const saved = localStorage.getItem(`sp_visitor_${token}`);
    if (saved) {
      try {
        const { vt, sName, sEmail } = JSON.parse(saved);
        setVisitorToken(vt);
        setName(sName || "");
        setEmail(sEmail || "");
        recoverSession(vt, token);
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Set up Pusher when visitor token is known
  useEffect(() => {
    if (!visitorToken) return;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2";

    if (!pusherKey || pusherKey === "your_pusher_key") {
      // Pusher not configured — no real-time, no polling needed
      return;
    }

    const pusher = new PusherClient(pusherKey, { cluster: pusherCluster });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(`widget-${visitorToken}`);
    channelRef.current = channel;

    channel.bind("new-message", (data: { message: Message }) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      // Notify parent frame
      window.parent.postMessage(
        { source: "superprofile-widget", type: "new-message" },
        "*"
      );
    });

    channel.bind("typing-start", (data: { source: string }) => {
      if (data.source === "agent") setIsAgentTyping(true);
    });

    channel.bind("typing-stop", (data: { source: string }) => {
      if (data.source === "agent") setIsAgentTyping(false);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`widget-${visitorToken}`);
      pusher.disconnect();
    };
  }, [visitorToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function recoverSession(vt: string, t: string) {
    try {
      const res = await fetch("/api/widget/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetToken: t, visitorToken: vt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setHasStarted(true);
          await loadMessages(vt);
          setView("chat");
        }
      }
    } catch {}
    setLoading(false);
  }

  async function loadMessages(vt: string) {
    try {
      const res = await fetch(`/api/widget/messages?visitorToken=${vt}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
  }

  async function startChat() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const vt =
        visitorToken ||
        `vt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

      const res = await fetch("/api/widget/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetToken: token,
          visitorToken: vt,
          visitorName: name,
          visitorEmail: email || undefined,
          currentPageUrl:
            typeof window !== "undefined" ? window.location.href : "",
          userAgent:
            typeof window !== "undefined" ? navigator.userAgent : "",
        }),
      });

      if (res.ok) {
        setVisitorToken(vt);
        setHasStarted(true);
        setView("chat");
        localStorage.setItem(
          `sp_visitor_${token}`,
          JSON.stringify({ vt, sName: name, sEmail: email })
        );
      }
    } catch {}
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() || sending || !visitorToken) return;
    const text = input.trim();
    setSending(true);
    setInput("");

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      senderType: "customer",
      bodyText: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/widget/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, bodyText: text }),
      });
      if (res.ok) {
        const data = await res.json();
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
      }
    } catch {}
    setSending(false);
  }

  async function searchArticles(q: string) {
    if (q.length < 2) { setArticles([]); return; }
    try {
      const res = await fetch(
        `/api/public/kb/search?token=${token}&q=${encodeURIComponent(q)}`
      );
      if (res.ok) setArticles((await res.json()).articles || []);
    } catch {}
  }

  const handleTyping = async (value: string) => {
    setInput(value);
    if (!visitorToken) return;

    // Broadcast typing
    fetch("/api/widget/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorToken, isTyping: true }),
    }).catch(() => {});

    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      fetch("/api/widget/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, isTyping: false }),
      }).catch(() => {});
    }, 2000);

    // Live KB suggestion for longer queries (PRD §6.6.3, §12.3)
    if (value.length >= 20) searchArticles(value);
    else if (value.length < 5) setArticles([]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-white overflow-hidden"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
      >
        <div className="flex items-center gap-3">
          {view !== "home" && (
            <button onClick={() => setView("home")} className="text-white/70 hover:text-white mr-1">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{workspaceName}</p>
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isAgentOnline ? "#4ade80" : "#94a3b8" }}
              />
              <p className="text-white/70 text-xs">
                {isAgentOnline ? "Online" : "Away"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() =>
            window.parent.postMessage(
              { source: "superprofile-widget", type: "close" },
              "*"
            )
          }
          className="text-white/70 hover:text-white transition-colors"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Home view */}
      {view === "home" && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-gradient-to-b from-indigo-500/5 to-transparent">
            <h2 className="text-base font-bold text-gray-900 mb-1">Hi there 👋</h2>
            <p className="text-sm text-gray-500">How can we help you today?</p>
          </div>
          <div className="px-4 space-y-2">
            <button
              onClick={() => setView("chat")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Send us a message</p>
                <p className="text-xs text-gray-400">Send us a message</p>
                <p className="text-xs text-gray-400">{responseTime}</p>
              </div>
            </button>
            <button
              onClick={() => setView("search")}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Search help articles</p>
                <p className="text-xs text-gray-400">Find answers instantly</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Chat view */}
      {view === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-indigo-500" />
                </div>
                <p className="text-sm text-gray-500">
                  Send us a message and we'll get back to you shortly.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.senderType === "customer"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.bodyText}
                  {msg.senderUser && msg.senderType !== "customer" && (
                    <p className="text-[10px] mt-0.5 opacity-60">{msg.senderUser.name}</p>
                  )}
                </div>
              </div>
            ))}
            {isAgentTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* KB suggestions */}
          {articles.length > 0 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Suggested articles
              </p>
              <div className="space-y-1">
                {articles.slice(0, 3).map((a) => (
                  <a
                    key={a.id}
                    href={`/help/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{a.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Identity capture or composer */}
          {!hasStarted ? (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs font-medium text-gray-700 mb-2">Let us know who you are:</p>
              <div className="space-y-2 mb-2">
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  placeholder="Your name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  type="email"
                  placeholder="Email (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                onClick={startChat}
                disabled={!name.trim() || loading}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {loading ? "Starting…" : "Start chat →"}
              </button>
            </div>
          ) : (
            <div className="p-3 border-t">
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
                  placeholder="Type a message…"
                  rows={2}
                  value={input}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Search / KB view */}
      {view === "search" && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 border-b sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchArticles(e.target.value);
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="px-4 py-3 space-y-2">
            {articles.length === 0 && searchQuery.length > 1 ? (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No articles found</p>
                <button
                  onClick={() => setView("chat")}
                  className="text-indigo-600 text-sm mt-2 hover:underline"
                >
                  Ask us directly →
                </button>
              </div>
            ) : (
              articles.map((a) => (
                <a
                  key={a.id}
                  href={`/help/${a.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                >
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  {a.excerpt && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.excerpt}</p>
                  )}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
