# SuperProfile — Customer Communication Platform

A production-ready, multi-tenant customer support platform built as a hiring assignment. Inspired by Intercom — featuring live chat, email support, a unified inbox, knowledge base, AI summaries, and custom domain support.

**Live Demo:** [https://super-profile-task.vercel.app](https://super-profile-task.vercel.app)
**Widget Demo:** [https://super-profile-task.vercel.app/widget-demo](https://super-profile-task.vercel.app/widget-demo)

> **Demo credentials:** `admin@acme.com` / `password123`, `agent@acme.com` / `password123`

---

## ✅ Assignment Acceptance Criteria

| Criterion | Status |
|---|---|
| Sign up and create workspace | ✅ |
| Invite teammate with role-based access | ✅ |
| Embeddable chat widget (1 script tag) | ✅ |
| Real-time chat (customer ↔ agent) | ✅ |
| Persistent chat history for returning visitors | ✅ |
| External email creates conversation in inbox | ✅ |
| Agent replies reach customer as threaded email | ✅ |
| Inbox filters (channel, assignee, status) | ✅ |
| Knowledge base authoring + public search | ✅ |
| Widget suggests relevant articles | ✅ |
| AI summary on long conversations | ✅ |
| Custom domain configuration flow | ✅ |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Cj9520/SuperProfile-Task.git
cd SuperProfile-Task
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values:

| Variable | Description | Source |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | [Neon](https://neon.tech) (free) or local Docker |
| `NEXTAUTH_SECRET` | 32+ char random string | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | e.g. `http://localhost:3000` |
| `APP_URL` | Same as above (server-side) | e.g. `http://localhost:3000` |
| `PUSHER_APP_ID` | Pusher app ID | [pusher.com](https://pusher.com) free tier |
| `PUSHER_KEY` | Pusher key | Same account |
| `PUSHER_SECRET` | Pusher secret | Same account |
| `PUSHER_CLUSTER` | e.g. `ap2` | Same account |
| `NEXT_PUBLIC_PUSHER_KEY` | Same as `PUSHER_KEY` | Public env |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `PUSHER_CLUSTER` | Public env |
| `EMAIL_ID` | SMTP sender email | Gmail account |
| `EMAIL_PASS` | SMTP password | Gmail app password |
| `DEEPSEEK_API_KEY` | AI API key | [platform.deepseek.com](https://platform.deepseek.com) |
| `INBOUND_EMAIL_SECRET` | Webhook secret for inbound email | Any random string |
| `WIDGET_URL` | Widget iframe URL | Same as `APP_URL` |

**Local Postgres via Docker:**
```bash
docker run -d --name sp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=superprofile \
  -p 55432:5432 postgres:16-alpine

# DATABASE_URL="postgresql://postgres:postgres@localhost:55432/superprofile?schema=public"
```

### 3. Set up database

```bash
npm run db:push      # Push Prisma schema → create tables
npm run db:generate  # Generate Prisma client types
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL (Neon)via Prisma ORM | Prisma 5.22 |
| Auth | JWT (jose) + bcrypt sessions | jose 5.x |
| Real-time | Pusher Channels | pusher 5.x / pusher-js 8.x |
| Email (outbound) | Nodemailer (SMTP) | 9.x |
| AI Summaries | DeepSeek API (`deepseek-v4-flash`) | via fetch |
| UI Primitives | Radix UI | 1.x–2.x |
| Styling | Tailwind CSS | 3.4.x |
| Rich Text Editor | Tiptap | 2.10.x |
| Validation | Zod | 3.x |
| Toast Notifications | react-hot-toast | 2.x |

### Why these choices?

| Choice | Rationale |
|---|---|
| **Next.js App Router** | Server components for zero-JS page shells; API routes co-located with feature code |
| **Prisma + PostgreSQL** | Strong typing, migrations, multi-tenant isolation via `workspaceId` on every query |
| **Pusher** | Managed WebSocket infra — no ops overhead. Free tier covers the demo comfortably |
| **DeepSeek over OpenAI/Gemini** | OpenAI-compatible API, cheap, fast. Called with plain `fetch` — no SDK lock-in |
| **Nodemailer (SMTP)** | No third-party dependency for outbound email; works with any SMTP provider |
| **JWT httpOnly cookies** | Stateless sessions with server-side validation; no DB hit per request |

---

## 🏗️ Architecture

### Directory Layout

```
SuperProfile/
├── app/
│   ├── (public)/           # Landing, login, signup pages
│   ├── (app)/              # Authenticated dashboard
│   │   ├── inbox/          # Unified inbox (conversations)
│   │   ├── contacts/       # Contact management
│   │   ├── knowledge-base/ # KB article CRUD
│   │   ├── reports/        # Analytics dashboard
│   │   ├── team/           # Team management & invites
│   │   ├── settings/       # Workspace settings + widget token
│   │   └── domains/        # Custom domain configuration
│   ├── api/                # 13 REST API route groups
│   │   ├── ai/             # AI summary endpoint
│   │   ├── auth/           # signup, login, logout, /me
│   │   ├── contacts/       # CRUD + conversation linking
│   │   ├── conversations/  # List, get, patch status/priority/assignee
│   │   ├── domains/        # DNS verify, bind, status
│   │   ├── email/          # Inbound webhook + reply dispatch
│   │   ├── invites/        # Team invite flow
│   │   ├── kb/             # Article + category CRUD
│   │   ├── notifications/  # Bell notifications
│   │   ├── public/         # Widget API (unauthenticated)
│   │   ├── reports/        # Metrics aggregation
│   │   ├── team/           # Member management
│   │   └── widget/         # Chat session + message handling
│   ├── widget/             # Embeddable chat widget (iframe)
│   ├── widget-demo/        # Per-workspace live preview page
│   └── help/               # Public knowledge base (custom domain target)
├── components/
│   ├── inbox/              # Conversation list, thread, sidebar, modals
│   ├── layout/             # App sidebar (responsive, mobile overlay)
│   └── ui/                 # Shared primitives (Button, Input, Badges, etc.)
├── features/
│   ├── ai/                 # DeepSeek summary service
│   ├── auth/               # JWT helpers, session management
│   ├── contacts/           # Contact service + validation
│   ├── conversations/      # Conversation + message service
│   ├── domains/            # DNS verification logic
│   ├── email/              # Nodemailer SMTP dispatcher
│   ├── kb/                 # Knowledge base service
│   ├── notifications/      # Notification fan-out
│   ├── reports/            # Metrics queries
│   ├── team/               # Invite flow, role enforcement
│   └── widget/             # Widget session + message handling
├── lib/
│   ├── auth.ts             # JWT sign/verify, session cookie helpers
│   ├── db.ts               # Prisma client singleton
│   ├── pusher.ts           # Server broadcaster + client factory
│   ├── rate-limit.ts       # In-memory per-IP rate limiting
│   └── utils.ts            # cn(), getInitials(), formatRelativeTime()
├── prisma/
│   └── schema.prisma       # 12 models (see below)
└── public/
    └── widget-loader.js    # 1-tag embed script
```

### Database Schema (12 models)

```
User               — global user account (email + password + verification)
Workspace          — multi-tenant root; holds widgetToken, slug, supportEmail
WorkspaceMember    — user↔workspace join; role = admin | agent
Contact            — visitor/customer record per workspace
Conversation       — thread (channel: chat | email, status, priority, assignee)
Message            — individual message (senderType: agent | contact | system)
ChatSession        — anonymous widget session linked to a Contact
KnowledgeBaseCategory  — KB top-level grouping
KnowledgeBaseArticle   — rich-text article (Tiptap HTML + plain text for search)
AiSummary          — cached DeepSeek summary per conversation
CustomDomain       — domain record (status: pending → verified → active)
Notification       — in-app bell notification per workspace member
```

### Request Flow

```
Browser                Next.js Server           External
  │                        │
  ├─ GET /inbox ──────────▶│ App Router page (server component)
  │                        │ getSession() → JWT cookie → userId + workspaceId
  │                        │
  ├─ POST /api/conversations├─▶ Zod validation
  │                        │   Prisma INSERT (workspaceId enforced)
  │                        │   Pusher trigger → all agents on workspace channel
  │                        │
  ├─ Widget iframe ────────▶│ /widget route (public, no auth)
  │  (widgetToken)         │ POST /api/widget/message
  │                        │   ChatSession lookup → Contact upsert → Message INSERT
  │                        │   Pusher trigger → conversation channel
  │
  │                        │◀─────── POST /api/email/inbound ── Email provider webhook
  │                        │   Parse → Contact upsert → Conversation upsert → Message
  │                        │   Pusher trigger → agent inbox
```

---

## 💬 Chat Widget

Install on any website with a single `<script>` tag:

```html
<script src="https://super-profile-task.vercel.app/widget-loader.js"
        data-widget-token="YOUR_WORKSPACE_TOKEN">
</script>
```

Find your token in **Settings → Widget Token**. Each workspace has its own isolated token; the live demo button in Settings opens `/widget-demo?token=<your_token>` so you always preview your own workspace's widget.

**Widget features:**
- Floating chat bubble with open/close animation
- Persistent session (anonymous visitor → Contact record on first message)
- Real-time message delivery via Pusher
- Typing indicators from agent side
- Article suggestions from your Knowledge Base
- Returning visitor recognition (session cookie)

---

## 📧 Email Pipeline

### Inbound email → Inbox

Configure your email provider to `POST` to:

```
https://your-domain.com/api/email/inbound
x-webhook-secret: <INBOUND_EMAIL_SECRET>
```

Supported payload formats: **Resend**, **Mailgun**, **Postmark** (parsed in `features/email/service.ts`).

The webhook:
1. Parses sender, subject, body (text + HTML)
2. Upserts a `Contact` by email
3. Creates or threads a `Conversation` (by `Message-ID` / `References` headers)
4. Creates a `Message` record
5. Fires a Pusher event → appears instantly in inbox

### Outbound (agent reply)

When an agent replies to an email conversation, Nodemailer sends via SMTP with proper threading headers (`Message-ID`, `In-Reply-To`, `References`) so the reply lands in the customer's thread.

---

## 🌐 Custom Domain Configuration

1. Admin adds a hostname in **Domains** (e.g. `help.yourcompany.com`)
2. System generates a verification token → stored as `CustomDomain`
3. Admin adds two DNS records:
   - `CNAME`: `help.yourcompany.com` → `super-profile-task.vercel.app`
   - `TXT`: `_superprofile-verify.help.yourcompany.com` → `<verification_token>`
4. Click **Verify** → `dns.promises.resolveTxt` checks TXT ownership; `resolveCname` checks routing
5. Domain binds to workspace knowledge base → `GET help.yourcompany.com` serves your KB

**SSL** is terminated by Vercel automatically once the CNAME resolves (Let's Encrypt). The app tracks `pending → verified → active` but does not manage certificates itself.

---

## 🤖 AI Summaries

- Powered by **DeepSeek** (`deepseek-v4-flash`, explicitly pinned — the `deepseek-chat` alias is avoided so provider re-pointing can't silently change the model)
- Called via the OpenAI-compatible API endpoint using plain `fetch` with `response_format: json_object` — no SDK dependency
- **Structured output:** `{ summary, what_user_needs, what_was_tried, current_status }`
- **Auto-refreshed** when a conversation is opened and has new messages since the last summary (one refresh per open — cost-aware)
- Results are cached in the `AiSummary` table; regeneration is manual from the right sidebar
- Graceful fallback: failures surface a toast and `503`; the inbox keeps working

---

## 👥 Inbox & Conversation Management

The inbox is the core of the platform:

- **Unified channel view** — chat and email conversations in one list
- **Filters** — by status (`open` / `snoozed` / `resolved`), channel, assignee, and free-text search
- **Status management** — Resolve, Reopen, Snooze (with time picker)
- **Priority** — Low / Normal / High, shown as a colored chip in the header
- **Assignment** — assign to any workspace agent from the right sidebar
- **Contact drawer** — click any contact name to view their profile, email, and conversation history
- **New conversation** — start chat or email conversation from inbox or contacts page
- **Real-time** — Pusher updates conversation list and message thread live; no polling

### Responsive layout
- **Mobile (`< sm`):** full-screen list or full-screen thread (toggled by tapping, with ← back button)
- **Tablet (`sm–xl`):** list + thread side by side; right sidebar hidden
- **Desktop (`xl+`):** full three-panel layout (list + thread + contact sidebar)

---

## 🔒 Security

| Measure | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds |
| Sessions | JWT (HS256, 7-day expiry), httpOnly + SameSite=Lax cookies |
| Tenant isolation | Every Prisma query filters by `workspaceId` from the verified session |
| Rate limiting | In-memory per-IP limiter on auth, widget message, and AI routes |
| Input validation | Zod schemas on all API inputs; HTML stored from Tiptap stripped for search |
| Email verification | Token-based flow; unverified accounts blocked from dashboard |

---

## 📊 Reports

The `/reports` page shows workspace-level metrics:

- Total conversations, open count, resolution rate
- Average first-response time and resolution time
- Message volume over time
- Breakdown by channel (chat vs email)

Metrics are computed server-side via aggregation queries and cached per request.

---

## 🚀 Deployment (Vercel)

```bash
# 1. Push to GitHub
git push origin main

# 2. Import project in Vercel dashboard (or use CLI)
vercel --prod

# 3. Set environment variables in Vercel dashboard
#    (all variables from .env.example, with production values)
#    APP_URL = https://your-app.vercel.app
#    NEXT_PUBLIC_APP_URL = https://your-app.vercel.app

# 4. Push schema to production DB once
vercel env pull .env.production.local
npx prisma db push --url "$DATABASE_URL"
```

The `build` script (`prisma generate && next build`) runs Prisma client generation automatically on every deploy. No manual migration step needed for schema changes — just `npx prisma db push`.

---

## ✂️ What's Built vs. Skipped

### ✅ Built

| Feature | Notes |
|---|---|
| Auth (signup, login, email verification, logout) | JWT sessions, bcrypt, token-based email verification |
| Multi-tenant workspaces | Slug-based, every query scoped by `workspaceId` |
| Team management | Invite by email, role-based (admin / agent), token-based invite link |
| Embeddable chat widget | 1 `<script>` tag, iframe, Pusher real-time, session persistence |
| Email inbound (webhook) | Multi-format: Resend / Mailgun / Postmark payloads |
| Email outbound (threaded) | Nodemailer SMTP, proper RFC 2822 threading headers |
| Unified inbox | Filters by status / channel, search, Pusher live updates |
| Conversation management | Status, priority, assignee, snooze with time picker |
| Contact management | Profile drawer, conversation history, email/chat linking |
| New conversation flow | Start chat or email from inbox or contacts page |
| Knowledge base | Rich text (Tiptap), categories, public KB page, article search |
| Widget article suggestions | Keyword scoring + phrase-match; returned in widget API response |
| AI summaries | DeepSeek `deepseek-v4-flash`, structured JSON output, auto-refresh |
| Custom domains | DNS TXT + CNAME verification, domain → KB binding |
| Analytics/Reports | Response time, resolution rate, message volume, channel breakdown |
| Notifications | In-app bell, unread count, mark-all-read |
| Responsive UI | Mobile hamburger sidebar, mobile inbox toggle (list ↔ thread), adaptive chip headers |

### ❌ Skipped (and why)

| Feature | Reason |
|---|---|
| AI auto-reply drafts | Deprioritized to keep core seven production-quality within time constraint |
| Canned responses / macros | Nice-to-have; not in acceptance criteria |
| SLA tracking | Requires time-zone-aware business hours logic; out of scope |
| Webhooks / public API | No acceptance criteria; addable straightforwardly via existing service layer |
| In-app SSL certificate automation | Delegated to Vercel / Let's Encrypt; app verifies DNS ownership only |
| Redis rate limiting | In-memory limiter used; Redis recommended for multi-instance prod |
| Embedding vector search for KB | Keyword scoring used; embeddings overkill at this article volume |

---

## ⚠️ Known Limitations

| Limitation | Detail |
|---|---|
| **Rate limiting is in-memory** | Works for single-instance deployments. For horizontal scaling, replace `lib/rate-limit.ts` with a Redis-backed store (e.g. `@upstash/ratelimit`) |
| **AI quota** | DeepSeek free tier has a limited daily quota. If the summary button returns an error, wait for quota reset or upgrade the API key |
| **Widget presence** | "Agent online" is heuristic (last activity within a time window), not socket-level presence |
| **Inbound email** | Requires an email provider webhook (Resend / Mailgun / Postmark) pointed at `/api/email/inbound` — no direct IMAP polling |
| **No file attachments** | Messages are text-only; image/file attachment support not implemented |
| **Single Pusher cluster** | Configured at build time; changing cluster requires redeployment |

---

## 🛠 Useful Scripts

```bash
npm run dev          # Development server (localhost:3000)
npm run build        # Production build (prisma generate + next build)
npm run db:push      # Sync Prisma schema to database
npm run db:generate  # Regenerate Prisma client types
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:seed      # Seed database with sample data
npm run db:reset     # Drop + recreate + seed
```
