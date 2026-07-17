import { prisma } from "@/lib/db";

/** Aggregate workspace support metrics over the given period (7d / 30d / 90d). */
export async function getReports(workspaceId: string, period: string) {
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [
    totalConversations,
    openConversations,
    resolvedConversations,
    totalMessages,
    newContacts,
    conversations,
    agentStats,
    channelBreakdown,
  ] = await Promise.all([
    prisma.conversation.count({
      where: { workspaceId, createdAt: { gte: since } },
    }),
    prisma.conversation.count({ where: { workspaceId, status: "open" } }),
    prisma.conversation.count({
      where: { workspaceId, resolvedAt: { gte: since } },
    }),
    prisma.message.count({ where: { workspaceId, createdAt: { gte: since } } }),
    prisma.contact.count({ where: { workspaceId, createdAt: { gte: since } } }),

    // Daily conversation volume (for chart).
    prisma.conversation.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      select: { createdAt: true, status: true, firstResponseAt: true, resolvedAt: true },
    }),

    // Top agents by resolved conversations.
    prisma.workspaceMember.findMany({
      where: { workspaceId, inviteStatus: "accepted" },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        assignedConversations: {
          where: { resolvedAt: { gte: since } },
          select: { id: true },
        },
      },
    }),

    prisma.conversation.groupBy({
      by: ["channel"],
      where: { workspaceId, createdAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  // Average first response time (minutes).
  const responseTimes = conversations
    .filter((c) => c.firstResponseAt)
    .map(
      (c) =>
        (new Date(c.firstResponseAt!).getTime() -
          new Date(c.createdAt).getTime()) /
        60000
    );
  const avgFirstResponseMin =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  // Daily volume chart data.
  const chartData: Record<
    string,
    { date: string; conversations: number; resolved: number }
  > = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    chartData[key] = { date: key, conversations: 0, resolved: 0 };
  }
  for (const c of conversations) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (chartData[key]) chartData[key].conversations++;
    if (c.resolvedAt) {
      const rKey = new Date(c.resolvedAt).toISOString().slice(0, 10);
      if (chartData[rKey]) chartData[rKey].resolved++;
    }
  }

  const resolutionRate =
    totalConversations > 0
      ? Math.round((resolvedConversations / totalConversations) * 100)
      : 0;

  return {
    period,
    metrics: {
      totalConversations,
      openConversations,
      resolvedConversations,
      resolutionRate,
      totalMessages,
      newContacts,
      avgFirstResponseMin,
    },
    chartData: Object.values(chartData),
    channelBreakdown,
    topAgents: agentStats
      .map((m) => ({
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        resolved: m.assignedConversations.length,
      }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 5),
  };
}
