"use client";

import { useState, useEffect } from "react";
import {
  BarChart2,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Mail,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getInitials } from "@/lib/utils";

type Metrics = {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  resolutionRate: number;
  totalMessages: number;
  newContacts: number;
  avgFirstResponseMin: number;
};

type ChartPoint = { date: string; conversations: number; resolved: number };

type AgentStat = {
  name: string;
  avatarUrl: string | null;
  resolved: number;
};

type ChannelBreakdown = { channel: string; _count: { id: number } }[];

type ReportData = {
  period: string;
  metrics: Metrics;
  chartData: ChartPoint[];
  channelBreakdown: ChannelBreakdown;
  topAgents: AgentStat[];
};

const PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function MiniBarChart({ data, maxVal }: { data: ChartPoint[]; maxVal: number }) {
  // Only show last 30 points if too many
  const points = data.slice(-30);
  const displayMax = maxVal || 1;

  return (
    <div className="flex items-end gap-0.5 h-16">
      {points.map((p, i) => {
        const convH = Math.max(2, (p.conversations / displayMax) * 60);
        const resH = Math.max(1, (p.resolved / displayMax) * 60);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end gap-px group relative"
          >
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {new Date(p.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
              {" · "}
              {p.conversations} new · {p.resolved} resolved
            </div>
            <div
              className="w-full rounded-t-sm bg-indigo-200 dark:bg-indigo-800"
              style={{ height: `${convH}px` }}
            />
            <div
              className="w-full rounded-t-sm bg-emerald-400 dark:bg-emerald-600"
              style={{ height: `${resH}px`, marginTop: "-100%" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  async function fetchData(p: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${p}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchData(period);
  }, [period]);

  const maxConversations = data
    ? Math.max(...data.chartData.map((p) => p.conversations), 1)
    : 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h1 className="text-base font-semibold">Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => fetchData(period)}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Failed to load report data
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "New conversations",
                  value: data.metrics.totalConversations.toLocaleString(),
                  icon: MessageSquare,
                  color: "text-indigo-500",
                  bg: "bg-indigo-50",
                },
                {
                  label: "Resolved",
                  value: data.metrics.resolvedConversations.toLocaleString(),
                  icon: CheckCircle,
                  color: "text-emerald-500",
                  bg: "bg-emerald-50",
                },
                {
                  label: "Resolution rate",
                  value: `${data.metrics.resolutionRate}%`,
                  icon: TrendingUp,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                },
                {
                  label: "Avg. first response",
                  value: formatMinutes(data.metrics.avgFirstResponseMin),
                  icon: Clock,
                  color: "text-orange-500",
                  bg: "bg-orange-50",
                },
                {
                  label: "Open conversations",
                  value: data.metrics.openConversations.toLocaleString(),
                  icon: MessageSquare,
                  color: "text-red-500",
                  bg: "bg-red-50",
                },
                {
                  label: "Messages sent",
                  value: data.metrics.totalMessages.toLocaleString(),
                  icon: Mail,
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                },
                {
                  label: "New contacts",
                  value: data.metrics.newContacts.toLocaleString(),
                  icon: Users,
                  color: "text-teal-500",
                  bg: "bg-teal-50",
                },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="bg-card border rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        metric.bg
                      )}
                    >
                      <Icon className={cn("w-4 h-4", metric.color)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-tight">
                        {metric.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {metric.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Volume chart */}
            <div className="bg-card border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Conversation Volume</h2>
                  <p className="text-xs text-muted-foreground">
                    New vs resolved conversations per day
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-indigo-200" />
                    New
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                    Resolved
                  </div>
                </div>
              </div>
              {data.chartData.length > 0 ? (
                <>
                  <MiniBarChart
                    data={data.chartData}
                    maxVal={maxConversations}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>
                      {new Date(data.chartData[0]?.date).toLocaleDateString(
                        "en",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                    <span>
                      {new Date(
                        data.chartData[data.chartData.length - 1]?.date
                      ).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                  No conversation data for this period
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Channel breakdown */}
              <div className="bg-card border rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-4">
                  Channel Breakdown
                </h2>
                {data.channelBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No data
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.channelBreakdown.map((ch) => {
                      const total = data.channelBreakdown.reduce(
                        (acc, c) => acc + c._count.id,
                        0
                      );
                      const pct = total > 0 ? Math.round((ch._count.id / total) * 100) : 0;
                      return (
                        <div key={ch.channel}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium capitalize">
                              {ch.channel === "internal_note"
                                ? "Internal notes"
                                : ch.channel}
                            </span>
                            <span className="text-muted-foreground">
                              {ch._count.id} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                ch.channel === "chat"
                                  ? "bg-indigo-500"
                                  : ch.channel === "email"
                                  ? "bg-purple-500"
                                  : "bg-amber-500"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top agents */}
              <div className="bg-card border rounded-xl p-5">
                <h2 className="text-sm font-semibold mb-4">
                  Top Agents by Resolved
                </h2>
                {data.topAgents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No resolved conversations in this period
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.topAgents.map((agent, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground/50 w-5 text-right">
                          {i + 1}
                        </span>
                        <Avatar className="h-7 w-7">
                          {agent.avatarUrl && (
                            <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                          )}
                          <AvatarFallback className="text-xs">
                            {getInitials(agent.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {agent.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-sm font-semibold">
                            {agent.resolved}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
