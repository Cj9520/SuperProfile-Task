import Link from "next/link";
import {
  MessageSquare,
  Mail,
  BookOpen,
  Bot,
  Globe,
  Users,
  Zap,
  ChevronRight,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Live Chat Widget",
    description:
      "One script tag embeds a powerful chat bubble on any website. Real-time, persistent, beautiful.",
    color: "from-zinc-800 to-zinc-900",
  },
  {
    icon: Mail,
    title: "Email Channel",
    description:
      "Inbound emails land directly in your inbox. Replies are sent with proper threading so customers stay in context.",
    color: "from-zinc-800 to-zinc-900",
  },
  {
    icon: Users,
    title: "Team Workspace",
    description:
      "Invite agents, assign conversations, and collaborate as a team with role-based access control.",
    color: "from-zinc-800 to-zinc-900",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description:
      "Create and publish help articles. Customers find answers before asking — the widget suggests articles automatically.",
    color: "from-zinc-800 to-zinc-900",
  },
  {
    icon: Bot,
    title: "AI Summaries",
    description:
      "Long conversations are summarized instantly by AI. Know what the customer needs before you read a single word.",
    color: "from-zinc-800 to-zinc-900",
  },
  {
    icon: Globe,
    title: "Custom Domain",
    description:
      "Host your help center on your own domain. Your brand, your domain, your customers.",
    color: "from-zinc-800 to-zinc-900",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SuperProfile</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" variant="gradient">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-28 gradient-bg">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-zinc-500/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full bg-zinc-500/10 blur-3xl" />
        </div>

        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-8 backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Production-ready customer support platform
          </div>

          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Customer support
            <br />
            <span className="gradient-text">reimagined</span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            One unified inbox for live chat and email. Knowledge base your
            customers will love. AI that summarizes before you read.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="xl" variant="gradient" className="shadow-2xl shadow-black/40 min-w-[200px]">
                Start for free
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/widget-demo">
              <Button
                size="xl"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm min-w-[200px]"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Try the widget
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16 text-white/60 text-sm">
            {[
              { label: "Deployment time", value: "< 5 mins" },
              { label: "Script tag install", value: "1 line" },
              { label: "AI powered", value: "Gemini" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white mb-0.5">{s.value}</p>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything your support team needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              All the tools your team needs to deliver exceptional customer
              support, in one beautifully designed platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 rounded-2xl border bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-zinc-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-zinc-500/10 blur-3xl" />
        </div>
        <div className="container text-center relative">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to transform your customer support?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Create your free workspace in under a minute. No credit card needed.
          </p>
          <Link href="/signup">
            <Button size="xl" variant="gradient" className="shadow-2xl shadow-black/40">
              Create your workspace
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="font-semibold text-foreground">SuperProfile</span>
          </div>
          <p>Customer Communication Platform · Built for the future</p>
        </div>
      </footer>
    </div>
  );
}
