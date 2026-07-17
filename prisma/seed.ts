/**
 * SuperProfile — Demo Seed Script
 * Run: npm run db:seed
 *
 * Creates:
 *  - 1 admin user  (admin@acme.com / password123)
 *  - 1 agent user  (agent@acme.com / password123)
 *  - 1 workspace "Acme Corp Support"
 *  - 5 contacts, 8 conversations, 30+ messages
 *  - 3 KB categories + 6 published articles
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ── 1. Users first (workspace needs createdByUserId) ──────────────────────

  const passwordHash = await bcrypt.hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@acme.com" },
    update: {},
    create: { email: "admin@acme.com", name: "Alex Admin", passwordHash },
  });

  const agentUser = await prisma.user.upsert({
    where: { email: "agent@acme.com" },
    update: {},
    create: { email: "agent@acme.com", name: "Sam Agent", passwordHash },
  });

  console.log("✅ Users: admin@acme.com / agent@acme.com (password: password123)");

  // ── 2. Workspace ───────────────────────────────────────────────────────────

  const workspace = await prisma.workspace.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp Support",
      slug: "acme-corp",
      supportEmail: "support@acme.com",
      widgetToken: "demo_widget_token_acme_corp_12345",
      createdByUserId: adminUser.id,
    },
  });

  console.log("✅ Workspace:", workspace.name);

  // ── 3. Workspace members ───────────────────────────────────────────────────

  const adminMember = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: adminUser.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: "admin",
      inviteStatus: "accepted",
    },
  });

  const agentMember = await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: agentUser.id } },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: agentUser.id,
      role: "agent",
      inviteStatus: "accepted",
    },
  });

  console.log("✅ Workspace members created");

  // ── 4. Contacts ────────────────────────────────────────────────────────────

  const contactData = [
    { name: "Sarah Miller", email: "sarah.miller@example.com", source: "chat" },
    { name: "James Chen",   email: "james.chen@techcorp.io",   source: "email" },
    { name: "Priya Patel",  email: "priya@startup.co",          source: "chat" },
    { name: "Tom Reyes",    email: "tom.reyes@enterprise.com",  source: "email" },
    { name: null,           email: null,                         source: "chat" },
  ];

  const contacts = await Promise.all(
    contactData.map((c) =>
      prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name: c.name,
          email: c.email,
          source: c.source,
          lastSeenAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      })
    )
  );

  console.log("✅ Contacts created:", contacts.length);

  // ── 5. Conversations ───────────────────────────────────────────────────────

  const convDefs = [
    { contact: contacts[0], channel: "chat",  status: "open",     subject: "Widget not loading on my site",      priority: "high" },
    { contact: contacts[1], channel: "email", status: "open",     subject: "Billing inquiry — Invoice #4892",    priority: "normal" },
    { contact: contacts[2], channel: "chat",  status: "resolved", subject: "How do I add team members?",         priority: "low" },
    { contact: contacts[3], channel: "email", status: "open",     subject: "API rate limits for enterprise plan", priority: "high" },
    { contact: contacts[4], channel: "chat",  status: "open",     subject: "Quick question about pricing",       priority: "normal" },
    { contact: contacts[0], channel: "chat",  status: "snoozed",  subject: "Feature request: dark mode",         priority: "low" },
    { contact: contacts[1], channel: "email", status: "resolved", subject: "Password reset not working",         priority: "normal" },
    { contact: contacts[2], channel: "chat",  status: "open",     subject: "Data export format question",        priority: "normal" },
  ];

  for (const def of convDefs) {
    const convCreatedAt = new Date(
      Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000
    );
    const conv = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: def.contact.id,
        channel: def.channel,
        status: def.status,
        priority: def.priority,
        subject: def.subject,
        assigneeMemberId: Math.random() > 0.4 ? agentMember.id : null,
        createdAt: convCreatedAt,
        lastMessageAt: new Date(convCreatedAt.getTime() + 5 * 60 * 1000),
        resolvedAt: def.status === "resolved" ? new Date() : null,
        snoozedUntil: def.status === "snoozed"
          ? new Date(Date.now() + 4 * 60 * 60 * 1000)
          : null,
        firstResponseAt: def.status !== "open"
          ? new Date(convCreatedAt.getTime() + 3 * 60 * 1000)
          : null,
      },
    });

    // Seed messages
    const msgs = buildMessages(
      def.channel,
      def.contact.name || "Visitor",
      conv.id,
      workspace.id,
      agentUser.id,
      convCreatedAt
    );
    for (const msg of msgs) {
      await prisma.message.create({ data: msg });
    }

    // Chat session for chat conversations
    if (def.channel === "chat") {
      await prisma.chatSession.create({
        data: {
          workspaceId: workspace.id,
          conversationId: conv.id,
          visitorToken: `vt_seed_${conv.id}`,
          visitorName: def.contact.name,
          visitorEmail: def.contact.email,
          isOnline: false,
          lastSeenAt: new Date(),
        },
      });
    }
  }

  console.log("✅ Conversations and messages created");

  // ── 6. Knowledge Base ──────────────────────────────────────────────────────

  // Clean up existing KB for this workspace to avoid slug conflicts
  await prisma.knowledgeBaseArticle.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.knowledgeBaseCategory.deleteMany({ where: { workspaceId: workspace.id } });

  const catGettingStarted = await prisma.knowledgeBaseCategory.create({
    data: {
      workspaceId: workspace.id,
      name: "Getting Started",
      slug: "getting-started",
      description: "Everything you need to get up and running",
      orderIndex: 1,
    },
  });

  const catWidget = await prisma.knowledgeBaseCategory.create({
    data: {
      workspaceId: workspace.id,
      name: "Widget & Integration",
      slug: "widget-integration",
      description: "How to add SuperProfile to your website",
      orderIndex: 2,
    },
  });

  const catBilling = await prisma.knowledgeBaseCategory.create({
    data: {
      workspaceId: workspace.id,
      name: "Account & Billing",
      slug: "account-billing",
      description: "Manage your account and subscription",
      orderIndex: 3,
    },
  });

  const articles = [
    {
      categoryId: catGettingStarted.id,
      title: "How to create your first workspace",
      slug: "create-first-workspace",
      excerpt: "A step-by-step guide to setting up your SuperProfile workspace.",
      bodyHtml: `<h2>Setting up your workspace</h2><p>After signing up, you'll be guided through creating your workspace. Give it a name that reflects your brand.</p><h3>Step 1: Name your workspace</h3><p>Choose a friendly, recognizable name. You can change this later in Settings.</p><h3>Step 2: Configure your support email</h3><p>Add your support email so inbound emails automatically create conversations in your inbox.</p><h3>Step 3: Invite your team</h3><p>Head to Team → Invite to bring in your support agents.</p>`,
    },
    {
      categoryId: catGettingStarted.id,
      title: "Inviting team members",
      slug: "inviting-team-members",
      excerpt: "Learn how to add agents and admins to your workspace.",
      bodyHtml: `<h2>Inviting your support team</h2><p>Go to <strong>Team</strong> in the sidebar and enter your colleague's email address. Select their role:</p><ul><li><strong>Admin</strong> — full access including settings and team management</li><li><strong>Agent</strong> — can handle conversations and use the inbox</li></ul><p>They'll receive an email with a secure invite link valid for 72 hours.</p>`,
    },
    {
      categoryId: catWidget.id,
      title: "Installing the chat widget",
      slug: "installing-chat-widget",
      excerpt: "Add live chat to your website with a single script tag.",
      bodyHtml: `<h2>One-line installation</h2><p>Copy the embed code from <strong>Settings → Widget Embed Code</strong> and paste it before the closing <code>&lt;/body&gt;</code> tag on your website.</p><p>That's it! The chat bubble will appear in the bottom-right corner of your site.</p>`,
    },
    {
      categoryId: catWidget.id,
      title: "Setting up inbound email",
      slug: "inbound-email-setup",
      excerpt: "Route customer emails directly into your SuperProfile inbox.",
      bodyHtml: `<h2>Email to inbox</h2><p>When a customer emails your support address, SuperProfile automatically creates a conversation in your inbox.</p><h3>Configuration</h3><p>Point your email provider's inbound webhook to:</p><pre><code>POST https://your-app.com/api/email/inbound</code></pre>`,
    },
    {
      categoryId: catBilling.id,
      title: "Understanding roles and permissions",
      slug: "roles-and-permissions",
      excerpt: "Admin vs Agent — what each role can do.",
      bodyHtml: `<h2>Role-based access</h2><p>Agents can read and reply to conversations and manage the knowledge base. Admins have full access including team management, billing, and custom domain configuration.</p>`,
    },
    {
      categoryId: catBilling.id,
      title: "Changing your subscription plan",
      slug: "changing-subscription-plan",
      excerpt: "How to upgrade, downgrade, or cancel your SuperProfile subscription.",
      bodyHtml: `<h2>Managing your subscription</h2><p>As the workspace admin, go to <strong>Settings → Billing</strong> to view your current plan and make changes. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period.</p>`,
    },
  ];

  for (const art of articles) {
    await prisma.knowledgeBaseArticle.create({
      data: {
        workspaceId: workspace.id,
        authorUserId: adminUser.id,
        categoryId: art.categoryId,
        title: art.title,
        slug: art.slug,
        excerpt: art.excerpt,
        bodyHtml: art.bodyHtml,
        searchText: art.bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
        status: "published",
        publishedAt: new Date(),
      },
    });
  }

  console.log("✅ Knowledge base articles created:", articles.length);
  console.log("\n🎉 Seed complete!");
  console.log("   Login:        admin@acme.com / password123");
  console.log("   Agent login:  agent@acme.com / password123");
  console.log("   Widget token: demo_widget_token_acme_corp_12345");
  console.log("   Widget demo:  http://localhost:3000/widget-demo");
  console.log("   Help center:  http://localhost:3000/help");
}

function buildMessages(
  channel: string,
  visitorName: string,
  conversationId: string,
  workspaceId: string,
  agentUserId: string,
  base: Date
) {
  const at = (offsetMin: number) =>
    new Date(base.getTime() + offsetMin * 60 * 1000);

  if (channel === "email") {
    return [
      {
        conversationId,
        workspaceId,
        senderType: "customer",
        bodyText: `Hi, I'm ${visitorName}. I have a question about your service.`,
        bodyHtml: `<p>Hi, I'm ${visitorName}. I have a question about your service.</p>`,
        channel: "email",
        direction: "inbound",
        deliveryStatus: "delivered",
        createdAt: at(0),
      },
      {
        conversationId,
        workspaceId,
        senderType: "agent",
        senderUserId: agentUserId,
        bodyText: "Hi! Thanks for reaching out. I'd be happy to help. Could you share more details?",
        bodyHtml: "<p>Hi! Thanks for reaching out. I'd be happy to help. Could you share more details?</p>",
        channel: "email",
        direction: "outbound",
        deliveryStatus: "delivered",
        createdAt: at(5),
      },
    ];
  }

  return [
    {
      conversationId,
      workspaceId,
      senderType: "customer",
      bodyText: "Hello! I need some help.",
      bodyHtml: "<p>Hello! I need some help.</p>",
      channel: "chat",
      direction: "inbound",
      deliveryStatus: "delivered",
      createdAt: at(0),
    },
    {
      conversationId,
      workspaceId,
      senderType: "agent",
      senderUserId: agentUserId,
      bodyText: "Hi! I'm here to help 😊 What can I assist you with today?",
      bodyHtml: "<p>Hi! I'm here to help 😊 What can I assist you with today?</p>",
      channel: "chat",
      direction: "outbound",
      deliveryStatus: "delivered",
      createdAt: at(2),
    },
    {
      conversationId,
      workspaceId,
      senderType: "customer",
      bodyText: "I was wondering about how to set up the widget on my site.",
      bodyHtml: "<p>I was wondering about how to set up the widget on my site.</p>",
      channel: "chat",
      direction: "inbound",
      deliveryStatus: "delivered",
      createdAt: at(4),
    },
    {
      conversationId,
      workspaceId,
      senderType: "agent",
      senderUserId: agentUserId,
      bodyText: "Great question! Copy the script tag from Settings → Widget Embed Code and paste it before </body>. Done in 30 seconds!",
      bodyHtml: "<p>Great question! Copy the script tag from Settings → Widget Embed Code and paste it before &lt;/body&gt;. Done in 30 seconds!</p>",
      channel: "chat",
      direction: "outbound",
      deliveryStatus: "delivered",
      createdAt: at(6),
    },
  ];
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
