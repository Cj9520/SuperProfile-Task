# SuperProfile — Customer Communication Platform

A production-ready, multi-tenant customer support platform built as a hiring assignment. Inspired by Intercom — featuring live chat, email support, a unified inbox, knowledge base, AI summaries, and custom domain support.

**Live Demo:** [https://chirag-red.vercel.app](https://chirag-red.vercel.app)  
**Widget Demo:** [https://chirag-red.vercel.app/widget-demo](https://chirag-red.vercel.app/widget-demo)  
**Support Email:** support+demo@superprofile.app

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
git clone <repo-url>
cd superprofile
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values:

| Variable | Source |
|---|---|
| `DATABASE_URL` | PostgreSQL — [Neon](https://neon.tech) (free) for prod, or a local/Docker Postgres for dev. The Prisma provider is `postgresql`; SQLite is not supported. |
| `NEXTAUTH_SECRET` | Any 32+ char random string (`openssl rand -base64 32`) |
| `PUSHER_APP_ID` + keys | [pusher.com](https://pusher.com) free tier (set both server `PUSHER_*` and public `NEXT_PUBLIC_PUSHER_*`) |
| `EMAIL_ID` + `EMAIL_PASS` | SMTP credentials (e.g. Gmail app password) for outbound email via Nodemailer |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com) |

See [`.env.example`](.env.example) for the full list with placeholders.

**Local Postgres via Docker (quick):**
```bash
docker run -d --name sp-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=superprofile -p 55432:5432 postgres:16-alpine
# DATABASE_URL="postgresql://postgres:postgres@localhost:55432/superprofile?schema=public"
```

### 3. Set up database

```bash
npm run db:push      # Create tables from Prisma schema
npm run db:generate  # Generate Prisma client
```

### 4. Run locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Database | PostgreSQL (Neon) via Prisma |
| Auth | JWT sessions (jose) + bcrypt |
| Real-time | Pusher Channels |
| Email (outbound) | Nodemailer (SMTP) |
| AI Summaries | DeepSeek (deepseek-v4-flash) |
| UI | Tailwind CSS + Radix UI primitives |
| Rich text | Tiptap |

---

## 🏗 Architecture

```
app/
  (public)/         → Landing, login, signup, public KB
  (app)/            → Authenticated dashboard (inbox, KB, team, settings, domains)
  api/              → All REST API routes
  widget/           → Embeddable chat widget iframe
  widget-demo/      → Demo page for evaluators
  help/             → Public knowledge base
components/
  inbox/            → Conversation list, thread, sidebar
  layout/           → App sidebar
  ui/               → Shared components (Button, Input, etc.)
features/
  <domain>/         → Per-domain service + validation (ai, auth, contacts,
                      conversations, domains, email, kb, notifications,
                      reports, team, widget)
lib/
  auth.ts           → JWT session management
  db.ts             → Prisma client singleton
  pusher.ts         → Real-time broadcasting
  rate-limit.ts     → In-memory rate limiting
  utils.ts          → Shared utilities
prisma/
  schema.prisma     → Database schema (12 models)
public/
  widget-loader.js  → Embeddable widget script
```

---

## 💬 Widget Embed

Install on any website with one line:

```html
<script src="https://your-domain.com/widget-loader.js" data-widget-token="your_token"></script>
```

Find your widget token in **Settings** after creating your workspace.

---

## 📧 Email Setup

### Inbound email

Configure your email provider to forward inbound emails to:
```
POST https://your-domain.com/api/email/inbound
Header: x-webhook-secret: your_INBOUND_EMAIL_SECRET
```

Supported payload formats: Resend, Mailgun, Postmark

### Outbound email

Replies are sent automatically when agents reply to email conversations. Threading headers (Message-ID, In-Reply-To, References) ensure proper thread continuity in email clients.

---

## 🌐 Custom Domain Configuration

1. Admin adds hostname in **Domains** settings (e.g., `help.yourcompany.com`)
2. System generates DNS verification instructions
3. Add two DNS records:
   - **CNAME**: `help.yourcompany.com` → `your-app.vercel.app`
   - **TXT**: `_superprofile-verify.help.yourcompany.com` → `verification_token`
4. **Verify** performs real DNS lookups (`dns.promises.resolveTxt` / `resolveCname`): the TXT record must contain the verification token (proves ownership → `verified`), and the CNAME must point at the app host (routing → SSL `active`)
5. On success: domain is bound to workspace knowledge base

**SSL provisioning**: Terminated by the platform — Vercel provisions certificates automatically once the CNAME resolves (Let's Encrypt when self-hosting). The app tracks `pending → verified` (ownership) and `pending → active` (SSL) states; certificate issuance itself is delegated to the platform rather than automated in-app.

---

## 🤖 AI Summaries

- Powered by **DeepSeek** (`deepseek-v4-flash`, pinned explicitly — the `deepseek-chat` alias is avoided so provider re-pointing can't silently change the model) via its OpenAI-compatible API with `response_format: json_object`
- Generated on demand from the right sidebar, and **auto-refreshed** when a conversation is opened with new messages since the last summary (guarded to one refresh per open — cost-aware by design)
- Graceful fallback: failures raise a notification and a 503; the inbox keeps working
- Structured output: summary, what user needs, what was tried, current status

---

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT sessions (7-day expiry, httpOnly cookies)
- Server-side workspace tenant isolation on all queries
- Rate limiting (in-memory) on auth, widget messages, and AI routes
- Input sanitization on rich text (HTML stored from Tiptap, stripped for search)
- CSRF: SameSite=Lax cookies + server-side session validation

---

## 🚀 Deployment (Vercel)

```bash
# Push to GitHub, then:
vercel --prod

# Set the env vars from .env.example in the Vercel dashboard
# (Production + Preview). Set APP_URL / NEXT_PUBLIC_APP_URL / WIDGET_URL
# to your Vercel URL. DATABASE_URL = your Neon pooled connection string.

# Push the schema to the production DB once:
vercel env pull
npx prisma db push
```

The build command (`prisma generate && next build`) runs the Prisma client
generation automatically on every deploy. The Prisma provider is already
`postgresql` — point `DATABASE_URL` at Neon and you're set.

---

## 📝 Trade-off Notes

| Decision | Rationale |
|---|---|
| Pusher over self-hosted WS | Managed, reliable, no infra ops. Free tier sufficient. |
| DeepSeek over OpenAI/Gemini | Cheap, fast, OpenAI-compatible API — called with plain `fetch`, no SDK dependency. |
| In-memory rate limiting | Simple, effective for single-instance. Redis recommended for production. |
| DNS verification via Node lookups | Real TXT/CNAME checks with `dns/promises`; certificate issuance delegated to the platform (Vercel/Let's Encrypt) rather than automated in-app. |
| KB suggest: keyword scoring | Phrase match first, per-keyword scoring fallback for natural-language questions. Embeddings-based retrieval deferred — overkill at this article volume. |

## ✂️ What's Built vs. Skipped

**All 7 core requirements are implemented** (auth/teams, chat widget with typing/presence/read receipts, email with threading, unified inbox, KB with widget auto-suggest, AI summaries, custom domains with real DNS verification).

**Stretch features implemented:** contact timeline (past conversations, last seen, source), analytics dashboard (response times, resolution rate).

**Skipped (and why):**
- **AI auto-reply drafts, canned responses, SLA tracking, webhooks/public API** — deprioritized to keep the core seven production-quality within 48h.
- **In-app SSL certificate automation** — delegated to Vercel's certificate provisioning; the app verifies ownership/routing via DNS and tracks state.

**Known limitations:**
- Rate limiting is in-memory (per-instance); use Redis for multi-instance deployments.
- Widget presence is heuristic (agent activity within a time window), not socket-level presence.
- Inbound email requires an email provider webhook (Resend/Mailgun/Postmark formats supported) pointed at `/api/email/inbound`.
