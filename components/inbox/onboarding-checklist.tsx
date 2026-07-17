"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Circle,
  Users,
  Code2,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    id: "invite",
    icon: Users,
    title: "Invite a teammate",
    description: "Add an agent or admin to your workspace",
    href: "/team",
    cta: "Go to Team →",
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-100 dark:border-violet-800/30",
  },
  {
    id: "widget",
    icon: Code2,
    title: "Install the chat widget",
    description: "One script tag on any website",
    href: "/settings",
    cta: "Get embed code →",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-100 dark:border-blue-800/30",
  },
  {
    id: "article",
    icon: BookOpen,
    title: "Create your first article",
    description: "Help customers find answers on their own",
    href: "/knowledge-base",
    cta: "Open KB editor →",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-100 dark:border-emerald-800/30",
  },
  {
    id: "chat",
    icon: MessageSquare,
    title: "Test the inbox",
    description: "Send a test message from the widget demo page",
    href: "/widget-demo",
    cta: "Open widget demo →",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-100 dark:border-orange-800/30",
  },
];

export function OnboardingChecklist({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allDone = completed.size === STEPS.length;

  return (
    <div className="border rounded-2xl overflow-hidden bg-card shadow-sm animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Get started with SuperProfile</p>
            <p className="text-xs text-muted-foreground">
              {completed.size}/{STEPS.length} steps complete
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(completed.size / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="p-4 space-y-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const done = completed.has(step.id);
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                done
                  ? "opacity-50 border-border bg-muted/30"
                  : `${step.bg} ${step.border}`
              }`}
            >
              {/* Check toggle */}
              <button
                onClick={() => toggle(step.id)}
                className="shrink-0 transition-transform hover:scale-110"
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/50" />
                )}
              </button>

              {/* Icon */}
              <div className={`shrink-0 ${done ? "opacity-40" : ""}`}>
                <Icon className={`w-4 h-4 ${step.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>

              {/* CTA */}
              {!done && (
                <Link
                  href={step.href}
                  className={`shrink-0 text-xs font-medium ${step.color} flex items-center gap-1 hover:underline`}
                >
                  {step.cta}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {allDone ? (
        <div className="px-5 py-4 border-t bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              You&apos;re all set! 🎉
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Click the circles to mark steps as done
          </p>
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
