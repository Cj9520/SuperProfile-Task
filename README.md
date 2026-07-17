# SuperProfile — Customer Communication Platform

A production-ready, multi-tenant customer support platform built as a hiring assignment. Inspired by Intercom — featuring live chat, email support, a unified inbox, knowledge base, AI summaries, and custom domain support.

**Live Demo:** [https://superprofile.vercel.app](https://superprofile.vercel.app)  
**Widget Demo:** [https://superprofile.vercel.app/widget-demo](https://superprofile.vercel.app/widget-demo)  
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
| `DATABASE_URL` | Neon.tech (free Postgres) or keep as `file:./dev.db` for SQLite |
| `NEXTAUTH_SECRET` | Any 32+ char random string |
| `PUSHER_APP_ID` + keys | [pusher.com](https://pusher.com) free tier |
| `RESEND_API_KEY` | [resend.com](https://resend.com) free tier |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) free |

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
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Database | PostgreSQL (Neon) / SQLite (dev) via Prisma |
| Auth | JWT sessions (jose) + bcrypt |
| Real-time | Pusher Channels |
| Email (outbound) | Resend |
| AI Summaries | Google Gemini 1.5 Flash |
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
lib/
  auth.ts           → JWT session management
  db.ts             → Prisma client singleton
  pusher.ts         → Real-time broadcasting
  email.ts          → Resend email service
  ai.ts             → Gemini AI integration
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

### Inbound email (Resend/Mailgun)

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
4. SuperProfile checks DNS propagation
5. On success: domain is bound to workspace knowledge base

**SSL provisioning**: Handled automatically via Vercel's SSL termination or Let's Encrypt when self-hosting. The backend state machine tracks `pending → verified` and `pending → active` (SSL) states faithfully even if automation is not wired end-to-end.

---

## 🤖 AI Summaries

- Powered by **Google Gemini 1.5 Flash** (free tier)
- Triggered manually via refresh button in the right sidebar
- Auto-suggested when conversation has 6+ messages
- Graceful fallback: shows error notification if AI is unavailable
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

# Set environment variables in Vercel dashboard
# Run DB migration:
vercel env pull
npx prisma db push
```

For production: switch `DATABASE_URL` to a Neon/Supabase PostgreSQL URL and update the Prisma provider from `sqlite` to `postgresql` in `schema.prisma`.

---

## 📝 Trade-off Notes

| Decision | Rationale |
|---|---|
| SQLite for local dev | Zero setup, easy for evaluators. Switch to Postgres for production. |
| Pusher over self-hosted WS | Managed, reliable, no infra ops. Free tier sufficient. |
| Gemini over OpenAI | Free tier with 1M tokens/month. Drop-in swap possible. |
| In-memory rate limiting | Simple, effective for single-instance. Redis recommended for production. |
| Custom domain DNS manual | Full state machine implemented. DNS automation requires infra (Cloudflare API) not feasible in 48h. |
