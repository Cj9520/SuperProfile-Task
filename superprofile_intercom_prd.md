# SuperProfile Customer Communication Platform Product Requirements Document v1.0

Document Status: Draft — Ready for Engineering  
Version: 1.0  
Prepared For: AI Coding Agent / Full-Stack Engineering Team  
Assignment Context: Build Intercom from scratch as a production-ready hiring assignment in 48 hours  
Suggested Stack: Next.js 14 App Router, PostgreSQL or MongoDB, Tailwind CSS, shadcn/ui, NextAuth or custom auth, WebSockets, background jobs, SMTP + inbound email provider, LLM API  
Target Release: V1 Assignment Submission

## 1. Executive Summary

SuperProfile Customer Communication Platform is a multi-tenant customer support and communication system that combines live chat, email support, workspace-based team collaboration, knowledge base publishing, AI issue summarization, and custom-domain help centers in a single product. The objective is to let any business create a workspace, install a chat widget on its website, receive customer messages from both chat and email, collaborate internally as support agents, and resolve issues from one unified inbox.[file:1]

The platform must be production-ready rather than a prototype, because the hiring assignment explicitly requires a live deployed product that evaluators can sign up for, test end to end, and verify across chat, email, knowledge base, and workspace workflows.[cite:1] The system therefore needs real authentication, persistent conversation history, working inbound and outbound email handling, role-based team management, and operational safeguards such as validation, logging, rate limiting, and tenant isolation.[cite:1]

This PRD is intentionally written in the same engineering-oriented format as the SkillBridge reference document: business context, user roles, data models, feature specifications, APIs, infrastructure requirements, security, and MVP scope are all specified in sufficient detail for direct implementation by an engineering team or AI coding agent.[file:1]

## 2. Problem Statement

Small and mid-sized internet businesses often handle customer communication across fragmented tools: website chat plugins, shared Gmail inboxes, ad hoc internal notes, and separate help-center products. This leads to lost context, poor ownership, delayed responses, and no single source of truth for the customer relationship.[cite:1]

Modern support teams need one workspace where agents can receive live chat conversations and email threads together, assign ownership, manage statuses, collaborate as a team, and provide self-serve help content through a knowledge base. The assignment text makes clear that the target product is not just a messaging UI but a full customer communication operating system with team workflows, AI assistance, and deployable production behavior.[cite:1]

### Pain Points

| Pain Point | Who Feels It | Current Workaround |
|---|---|---|
| Website chat and support email live in different tools | Support teams | Switching between inboxes and dashboards |
| No shared ownership model for conversations | Admins and agents | Manual Slack messages or spreadsheets |
| Users repeat the same issue across channels | Customers | Re-explaining context to each responder |
| Long threads are slow to understand | Support agents | Reading the full history manually |
| Help articles are disconnected from live support | Customers and agents | Sending raw links from another tool |
| Branded knowledge base needs custom domain | Businesses | Separate CMS or subdomain setup |
| Hiring evaluators need a live, testable product in 48 hours | Candidate builder | Aggressive scope control and production trade-offs |

All seven mandatory features in the assignment are non-negotiable, and partial submissions are explicitly disallowed.[cite:1] That means the product scope must be aggressively prioritized around working end-to-end flows rather than superficial breadth.[cite:1]

## 3. Actors & Roles

The system has exactly three functional personas in V1: Workspace Admin, Support Agent, and End User. Evaluators interact as both workspace creators and end users while testing the product.[cite:1]

### 3.1 Workspace Admin

Workspace Admin capabilities:
- Creates a workspace during signup and becomes its initial owner.
- Invites team members by email.
- Assigns roles to invited users.
- Configures chat widget settings, support email routing, and knowledge base settings.
- Connects a custom domain for the public help center.
- Has full access to all conversations, team members, articles, and workspace settings.
- Can assign, reassign, snooze, and resolve any conversation.
- Can manage canned responses and operational settings if stretch features are implemented.

| Action | Workspace Admin |
|---|---|
| Create workspace | Yes |
| Invite users | Yes |
| Manage roles | Yes |
| View all conversations | Yes |
| Assign conversations | Yes |
| Publish articles | Yes |
| Connect custom domain | Yes |
| Edit workspace settings | Yes |

### 3.2 Support Agent

Support Agent capabilities:
- Logs into an existing approved workspace account.
- Works from the unified inbox across chat and email.
- Replies to customers by chat or email from the dashboard.
- Updates statuses: Open, Snoozed, Resolved.
- Can be assigned or reassigned to conversations.
- Can view AI-generated summaries for long threads.
- Can create or edit knowledge base articles if workspace policy allows; for MVP, this can be admin-only or admin+agent based on implementation choice documented in README.[cite:1]

| Action | Support Agent |
|---|---|
| Sign in | Yes |
| View assigned conversations | Yes |
| View all conversations | Configurable, default Yes |
| Reply to chat | Yes |
| Reply to email | Yes |
| Change status | Yes |
| View AI summary | Yes |
| Manage billing/domain settings | No |

### 3.3 End User / Customer

End User capabilities:
- Starts a chat from the embeddable widget.
- Returns later and sees persisted chat history in the widget.[cite:1]
- Sends an email to the workspace support address and receives threaded replies from agents.[cite:1]
- Searches and reads public knowledge base articles.
- Receives article suggestions in the chat widget based on typed questions.[cite:1]

End users do not have dashboard accounts in V1. Their identity is represented through visitor profiles, email contacts, browser session metadata, and conversation records.

## 4. Authentication & Authorization

### 4.1 Authentication Method

The assignment requires at minimum email and password signup/login.[cite:1] V1 should support workspace signup via email/password, secure session management, password hashing, and optional invitation-acceptance login for agents.

Recommended implementation:
1. New user signs up with name, work email, password, workspace name.
2. System creates workspace and sets this user as Workspace Admin.
3. Admin invites teammates by email.
4. Invitee receives invite link, sets password, joins workspace as Agent or Admin.
5. All subsequent sessions are scoped to a workspace membership.

### 4.2 Authorization Model

Every protected request must validate:
- Authenticated user identity.
- Active workspace membership.
- User role within that workspace.
- Tenant scope for all conversation, article, domain, and configuration records.[cite:1]

### 4.3 Access Control Matrix

| Action | Workspace Admin | Support Agent | End User |
|---|---|---|---|
| Sign up / sign in | Yes | Yes | Chat/email only |
| Create workspace | Yes | No | No |
| Invite team members | Yes | No | No |
| Manage team roles | Yes | No | No |
| View unified inbox | Yes | Yes | No |
| Assign conversations | Yes | Yes |
 No |
| Resolve / snooze conversations | Yes | Yes | No |
| Publish knowledge base | Yes | Optional | No |
| Configure custom domain | Yes | No | No |
| Use chat widget | No | No | Yes |
| Search public KB | No | No | Yes |

## 5. Data Models

The reference PRD uses strongly typed collections and explicit embedded schemas.[file:1] This product should similarly define first-class entities for workspace management, contacts, messages, channels, and public content.

### 5.1 users

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| email | String unique | Login email |
| passwordHash | String | Secure hash, never plaintext |
| name | String | Display name |
| avatarUrl | String | Optional |
| globalStatus | Enum(active, invited, suspended) | User lifecycle |
| createdAt | DateTime | Timestamp |
| updatedAt | DateTime | Timestamp |
| lastLoginAt | DateTime | Optional |

### 5.2 workspaces

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| name | String | Workspace name |
| slug | String unique | App URL identifier |
| plan | Enum(free, assignment) | Simplified for V1 |
| supportEmail | String | Routed inbox address |
| widgetToken | String unique | Public widget embed identifier |
| kbSubpath | String | Public KB slug if needed |
| createdByUserId | FK users | Workspace owner |
| createdAt | DateTime | Timestamp |
| updatedAt | DateTime | Timestamp |

### 5.3 workspaceMembers

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| userId | FK users | Member identity |
| role | Enum(admin, agent) | Role-based access |
| inviteStatus | Enum(pending, accepted, revoked) | Invitation status |
| invitedByUserId | FK users | Audit trail |
| createdAt | DateTime | Timestamp |

### 5.4 contacts

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| email | String | Optional for chat-first contact |
| name | String | Optional |
| externalId | String | Optional future CRM mapping |
| lastSeenAt | DateTime | Useful for timeline |
| source | Enum(chat, email, imported) | Contact origin |
| createdAt | DateTime | Timestamp |

### 5.5 conversations

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| contactId | FK contacts | Customer identity |
| channel | Enum(chat, email) | Source channel |
| subject | String | Email subject or generated title |
| status | Enum(open, snoozed, resolved) | Mandatory assignment states[cite:1] |
| assigneeMemberId | FK workspaceMembers | Current owner |
| priority | Enum(low, normal, high) | Optional but useful |
| lastMessageAt | DateTime | Sorting |
| firstResponseAt | DateTime | Stretch SLA basis |
| resolvedAt | DateTime | Resolution marker |
| sourceThreadKey | String | Email thread or chat session key |
| createdAt | DateTime | Timestamp |
| updatedAt | DateTime | Timestamp |

### 5.6 messages

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| conversationId | FK conversations | Parent thread |
| workspaceId | FK workspaces | Tenant reference |
| senderType | Enum(customer, agent, system, ai) | Message source |
| senderUserId | FK users | Null for customer/system |
| bodyText | Text | Canonical message body |
| bodyHtml | Text | Sanitized rich rendering for email / KB context |
| channel | Enum(chat, email, internal_note) | Delivery context |
| direction | Enum(inbound, outbound) | Useful for inbox logic |
| emailMessageId | String | SMTP / inbound threading support[cite:1] |
| emailInReplyTo | String | Threading support[cite:1] |
| deliveryStatus | Enum(sent, delivered, failed, received) | Operational state |
| readAt | DateTime | Read receipts for chat |
| createdAt | DateTime | Timestamp |

### 5.7 chatSessions

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| conversationId | FK conversations | Linked conversation |
| visitorToken | String | Browser persistence token |
| visitorName | String | Optional |
| visitorEmail | String | Optional |
| currentPageUrl | String | Last known page |
| userAgent | String | Optional telemetry |
| isOnline | Boolean | Presence state |
| lastSeenAt | DateTime | Presence and reconnect logic |
| createdAt | DateTime | Timestamp |

### 5.8 knowledgeBaseCategories

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| name | String | Section title |
| slug | String | Public URL slug |
| description | String | Optional |
| orderIndex | Number | Manual ordering |
| createdAt | DateTime | Timestamp |

### 5.9 knowledgeBaseArticles

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| categoryId | FK knowledgeBaseCategories | Section grouping |
| title | String | Article title |
| slug | String | Public URL slug |
| excerpt | String | Search summary |
| bodyJson / bodyHtml | Text / JSON | Rich text content |
| status | Enum(draft, published) | Publication state |
| searchText | Text | Flattened search index |
| authorUserId | FK users | Creator |
| publishedAt | DateTime | Optional |
| updatedAt | DateTime | Timestamp |

### 5.10 aiSummaries

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| conversationId | FK conversations | One active summary per conversation |
| workspaceId | FK workspaces | Tenant reference |
| summaryText | Text | Concise issue summary |
| userNeed | Text | What user wants |
| attemptedActions | Text | What has been tried |
| currentStatus | Text | Current state of resolution |
| sourceMessageCount | Number | Messages summarized |
| modelName | String | LLM audit |
| lastGeneratedAt | DateTime | Refresh timestamp |

### 5.11 customDomains

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| hostname | String unique | e.g. help.example.com[cite:1] |
| verificationToken | String | DNS verification token |
| verificationStatus | Enum(pending, verified, failed) | Domain lifecycle |
| sslStatus | Enum(pending, active, failed) | Certificate status |
| provider | Enum(cloudflare, vercel, manual) | Infra approach |
| createdAt | DateTime | Timestamp |

### 5.12 notifications

| Field | Type | Notes |
|---|---|---|
| id | UUID / ObjectId | Primary key |
| workspaceId | FK workspaces | Tenant reference |
| userId | FK users | Recipient |
| type | String | invite, assignment, reply, summary_failed, etc. |
| message | String | Notification body |
| read | Boolean | Default false |
| link | String | Deep link into app |
| createdAt | DateTime | Timestamp |

## 6. Feature Specifications

### 6.1 Workspace Signup & Onboarding

#### 6.1.1 Public Landing / Auth Entry
- Public landing page explains the product and offers signup/login.
- Signup requires email, password, full name, and workspace name at minimum.[cite:1]
- Login uses email + password.[cite:1]
- After signup, user lands in a newly created workspace dashboard as Workspace Admin.

#### 6.1.2 Initial Workspace Setup
- Generate workspace slug and widget token.
- Provision default support mailbox alias or workspace inbox identity.
- Seed one default knowledge base category such as “Getting Started”.
- Show onboarding checklist: invite teammate, install widget, create article, test inbox.

### 6.2 Team Management

#### 6.2.1 Invite Team Members
- Admin enters teammate email and selects role: Admin or Agent.[cite:1]
- Invite email includes secure tokenized accept link.
- Pending invites appear in team settings.
- Admin can revoke or resend invite.

#### 6.2.2 Role-Based Access
- Admin role can manage members and settings.
- Agent role cannot manage workspace-level settings.
- Membership checks occur server-side on every protected route.

#### 6.2.3 Conversation Assignment
- Any inbox conversation can be assigned to a specific agent.[cite:1]
- Assignment change generates in-app notification to new assignee.
- Inbox supports filters by assignee and unassigned state.[cite:1]

### 6.3 Chat Bubble / Live Chat Channel

#### 6.3.1 Embeddable Widget
- Widget must be installable via a single script tag on any website.[cite:1]
- Script loads a launcher bubble and chat panel.
- Widget identifies target workspace using widget token.
- Demo page for evaluator testing is mandatory in submission checklist.[cite:1]

Example embed contract:
```html
<script src="https://your-domain.com/widget.js" data-widget-token="workspace_public_token"></script>
```

#### 6.3.2 Real-Time Messaging
- Customer sends messages from widget; agents receive them in dashboard in real time.[cite:1]
- Agents reply from dashboard; customers receive instantly in widget.[cite:1]
- WebSocket or equivalent real-time channel handles new messages, typing indicators, presence, and read receipts.[cite:1]

#### 6.3.3 Widget Experience
- Typing indicator when agent or customer is typing.[cite:1]
- Online/offline indicator for support availability.[cite:1]
- Read receipts after message viewed.[cite:1]
- Customer identity capture flow can ask for name/email when needed.
- Conversation transcript persists so returning user sees previous history.[cite:1]

### 6.4 Email Channel

#### 6.4.1 Incoming Email Parsing
- Workspace has a testable support email address that routes into the unified inbox.[cite:1]
- Inbound provider parses sender, subject, body, headers, message-id, and in-reply-to metadata.[cite:1]
- New inbound email either creates a new conversation or attaches to an existing thread.

#### 6.4.2 Outbound Replies
- Agent replies from dashboard UI.
- Customer receives a normal email from the workspace support identity.[cite:1]
- Reply should preserve thread headers and subject continuity.

#### 6.4.3 Threading Logic
- Must use Message-ID and In-Reply-To semantics to keep replies in one conversation thread.[cite:1]
- If threading headers are missing, fallback heuristics may use normalized subject + contact identity, but header-based matching remains primary.

### 6.5 Unified Inbox

#### 6.5.1 Inbox Overview
- Single inbox view combines chat and email conversations.[cite:1]
- Conversation list shows channel, customer identity, status, assignee, preview, and updated time.
- Sorting defaults to most recent activity.

#### 6.5.2 Filters & Statuses
- Filter by channel, assignee, status.[cite:1]
- Status values: Open, Snoozed, Resolved.[cite:1]
- Support search by contact name, email, subject, and message body snippet.

#### 6.5.3 Conversation Actions
- Assign / reassign conversation.[cite:1]
- Snooze until a chosen date/time.[cite:1]
- Resolve or reopen conversation.[cite:1]
- Optional internal note support can be included as a productivity enhancer.

### 6.6 Knowledge Base

#### 6.6.1 Article Authoring
- Admin creates, edits, and publishes help articles with a rich text editor.[cite:1]
- Articles belong to categories / sections.[cite:1]
- Draft and published states required.

#### 6.6.2 Public Help Center
- Public-facing knowledge base page lists categories and articles.[cite:1]
- Search returns relevant articles by title, excerpt, and body index.[cite:1]
- Public KB must be accessible either on main app domain path or connected custom domain.

#### 6.6.3 Chat Auto-Suggestions
- When customer types a question in the widget, system suggests relevant articles from the workspace KB.[cite:1]
- Matching can be keyword-based in MVP and upgraded later with semantic retrieval.

### 6.7 AI Issue Summarization

#### 6.7.1 Summary Trigger
- When agent opens a long conversation, the system generates a concise summary using an LLM.[cite:1]
- Summary refreshes as conversation grows.[cite:1]
- Define “long” via threshold, for example 6 or more messages, configurable.

#### 6.7.2 Summary Structure
- What the user wants.[cite:1]
- What has been tried.[cite:1]
- Current status.[cite:1]
- Optional confidence or last updated timestamp.

#### 6.7.3 Reliability Rules
- If LLM call fails, UI shows graceful fallback rather than blocking inbox use.[cite:1]
- Summary jobs should be async where possible to avoid slow conversation loads.
- Log token usage and response latency for cost awareness.

### 6.8 Custom Domains

#### 6.8.1 Domain Setup
- Workspace Admin can add a hostname such as help.theirdomain.com.[cite:1]
- UI shows verification instructions, expected DNS record, and status.

#### 6.8.2 SSL Provisioning
- System must handle or clearly define SSL provisioning workflow using provider such as Let’s Encrypt or Cloudflare.[cite:1]
- If DNS automation is stubbed in assignment delivery, approach must still be fully explained in README per assignment requirement.[cite:1]

#### 6.8.3 Routing
- Verified custom domain resolves to that workspace’s public knowledge base only.
- Tenant isolation must prevent one domain from serving another workspace’s content.

## 7. API Route Specifications

The reference PRD defines role-scoped API sections grouped by feature area.[file:1] This product should similarly expose modular route groups under `/api` with strict workspace scoping.

### 7.1 Auth Routes

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Create user + workspace | Public |
| POST | `/api/auth/login` | Session login | Public |
| POST | `/api/auth/logout` | End session | Authenticated |
| GET | `/api/auth/me` | Current user + workspace membership | Authenticated |
| POST | `/api/invites/accept` | Accept team invite and set password | Public token |

### 7.2 Team Routes

| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/api/team/members` | List workspace members | Admin |
| POST | `/api/team/invites` | Send invite | Admin |
| PATCH | `/api/team/members/:id` | Update member role/status | Admin |
| DELETE | `/api/team/invites/:id` | Revoke invite | Admin |

### 7.3 Inbox & Conversation Routes

| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/api/conversations` | List conversations with filters | Admin, Agent |
| GET | `/api/conversations/:id` | Conversation detail + messages + summary | Admin, Agent |
| PATCH | `/api/conversations/:id` | Assign, snooze, resolve, reopen | Admin, Agent |
| POST | `/api/conversations/:id/messages` | Agent reply or internal note | Admin, Agent |
| POST | `/api/conversations/:id/read` | Mark read | Admin, Agent |

### 7.4 Chat Widget Routes

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/widget/config/:token` | Public widget bootstrap config | Public |
| POST | `/api/widget/session` | Create/recover visitor session | Public |
| GET | `/api/widget/conversations/:sessionId` | Get prior chat history | Public session |
| POST | `/api/widget/messages` | Post end-user message | Public session |
| POST | `/api/widget/typing` | Typing indicator event | Public session |

### 7.5 Email Webhook Routes

| Method | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/email/inbound` | Receive parsed inbound email webhook | Provider verified |
| POST | `/api/email/outbound` | Send outbound email reply | Admin, Agent |
| POST | `/api/email/events` | Delivery / bounce events | Provider verified |

### 7.6 Knowledge Base Routes

| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/api/kb/categories` | List categories | Admin, Agent |
| POST | `/api/kb/categories` | Create category | Admin |
| GET | `/api/kb/articles` | List articles | Admin, Agent |
| POST | `/api/kb/articles` | Create article | Admin |
| PATCH | `/api/kb/articles/:id` | Update article | Admin |
| GET | `/api/public/kb/search` | Public KB search | Public |
| GET | `/api/public/kb/articles/:slug` | Public article detail | Public |

### 7.7 AI Routes

| Method | Route | Description | Role |
|---|---|---|---|
| POST | `/api/ai/conversations/:id/summarize` | Generate or refresh summary | Admin, Agent |
| GET | `/api/ai/conversations/:id/summary` | Fetch latest summary | Admin, Agent |

### 7.8 Domain Routes

| Method | Route | Description | Role |
|---|---|---|---|
| GET | `/api/domains` | List workspace domains | Admin |
| POST | `/api/domains` | Add custom domain | Admin |
| PATCH | `/api/domains/:id/verify` | Trigger verification | Admin |
| DELETE | `/api/domains/:id` | Remove domain | Admin |

## 8. UI / UX Specifications

The SkillBridge reference specifies a clean, professional, implementation-oriented design language with explicit navigation and component definitions.[file:1] This product should follow the same level of clarity, but for a modern SaaS inbox experience.

### 8.1 Design Language
- Clean support-ops dashboard aesthetic.
- Responsive layout optimized for desktop and workable on tablet/mobile.
- Left navigation, conversation list, conversation pane, and contextual sidebar for details/AI summary.
- Channel indicators for chat and email.
- Strong empty states, loading states, and failure fallbacks.

Suggested token direction:
- Primary: dark slate / near-black for app chrome.
- Accent: blue or teal for interactive focus.
- Success: green.
- Warning: amber.
- Danger: red.
- Surface hierarchy for inbox panels and cards.

### 8.2 Core Layouts

#### Workspace Dashboard Navigation
- Inbox
- Knowledge Base
- Team
- Settings
- Domains
- Optional Analytics

#### Inbox Layout
- Left sidebar: nav and quick filters.
- Middle pane: conversation list.
- Main pane: full conversation thread.
- Right pane: customer profile, AI summary, metadata.

#### Public KB Layout
- Search bar.
- Category grid or sidebar.
- Article detail page.
- Branded header/footer.

### 8.3 Key Components

| Component | Description |
|---|---|
| ConversationListItem | Channel icon, subject/name, snippet, status, assignee, time |
| MessageBubble | Distinguishes agent/customer/system messages |
| Composer | Chat/email reply editor with send action |
| AssigneeSelect | Reassign conversation to team member |
| StatusBadge | Open / Snoozed / Resolved |
| TeamInviteModal | Invite user and assign role |
| ArticleEditor | Rich text editing experience |
| ArticleSuggestionCard | Suggested KB result shown in widget |
| AISummaryPanel | Structured summary block with refresh state |
| DomainVerificationCard | DNS token instructions and verification status |
| WidgetLauncher | Embeddable public-facing chat entry |

## 9. Real-Time Infrastructure

The assignment explicitly evaluates real-time architecture including connection state, reconnection logic, and ordering guarantees.[cite:1] V1 must therefore define not just “use WebSockets” but the behaviors expected from the real-time layer.[cite:1]

Required behaviors:
- Workspace agents receive new chat messages without refresh.[cite:1]
- Typing state expires automatically after a short timeout.[cite:1]
- Presence state updates on connect/disconnect or heartbeat.[cite:1]
- Message ordering must be deterministic via server timestamp / sequence ID.[cite:1]
- Reconnection should backfill missed messages on reconnect.[cite:1]

Recommended approach:
- WebSocket server or managed realtime provider.
- Persist message first, then broadcast event.
- Use optimistic UI sparingly and reconcile with server-confirmed message IDs.

## 10. Email Handling

The assignment separately evaluates email engineering quality, including SMTP, inbound parsing, threading headers, and deliverability.[cite:1] This makes email handling a first-class subsystem rather than a side feature.[cite:1]

### 10.1 Inbound Email
- Receive via provider webhook or mail ingress service.
- Validate provider signature.
- Parse plain text, HTML, headers, attachments metadata if supported.
- Map sender to contact.
- Match thread by Message-ID / In-Reply-To / References chain.[cite:1]

### 10.2 Outbound Email
- Send replies through SMTP or API provider.
- Set proper From, Reply-To, Message-ID, In-Reply-To, and References headers.[cite:1]
- Store outbound payload and provider response for audit.

### 10.3 Deliverability Considerations
- Domain verification for sending domain.
- SPF, DKIM, and DMARC documented.
- Bounce and failure events surfaced in logs or admin-visible status.

## 11. Notification System

Events that should generate in-app notifications:
- New conversation assigned.
- New customer reply on assigned conversation.
- Team invite sent / accepted.
- Domain verification success or failure.
- AI summary generation failure.
- Conversation reopened after resolve.

Optional email notifications can be sent for invites and important assignment events. Noise-heavy notifications should be avoided for MVP unless user preferences exist.

## 12. Search & Matching Logic

### 12.1 Inbox Search
- Search conversations by contact name, email, subject, and message body.
- Filters must combine with search without resetting user context.

### 12.2 Knowledge Base Search
- Public search indexes title, excerpt, category, and article body.[cite:1]
- Search should return relevant article cards with title and excerpt.

### 12.3 Widget Article Suggestions
- Trigger on customer input length threshold, for example 20+ characters.
- Match top 3 articles.
- Show suggestions before or alongside sending message.[cite:1]

## 13. Custom Domain Implementation Notes

The assignment allows explaining DNS verification approach even if partially stubbed, but SSL handling and custom-domain architecture must still be thought through.[cite:1]

Suggested V1 approach:
1. Admin enters desired hostname.
2. System generates TXT or CNAME verification instruction.
3. User configures DNS.
4. Verification job checks DNS propagation.
5. On success, system binds hostname to KB workspace.
6. SSL is provisioned through platform provider or reverse proxy integration.[cite:1]

If full automation is not feasible within 48 hours, the implemented UI and backend state machine should still model the real lifecycle faithfully and document the missing automation explicitly.[cite:1]

## 14. Error Handling & Validation

The reference PRD includes explicit HTTP error patterns and shared schema validation.[file:1] This product should do the same because production readiness is part of evaluation.[cite:1]

Recommended error responses:

| Scenario | HTTP Code | Error Message |
|---|---|---|
| Unauthenticated request | 401 | Authentication required |
| Invalid workspace access | 403 | Insufficient permissions |
| Conversation not found | 404 | Conversation not found |
| Invalid invite token | 410 | Invite link expired or invalid |
| Invalid email thread payload | 422 | Invalid inbound email payload |
| Duplicate custom domain | 409 | Domain already connected |
| Rate limit exceeded | 429 | Too many requests |
| LLM provider unavailable | 503 | Summary service temporarily unavailable |
| Internal server error | 500 | Internal server error |

Validation rules:
- All forms validated client-side and server-side.
- Rich text sanitized before storage/render.
- Email header and webhook payload validation enforced.
- Widget message input length and spam limits enforced.

## 15. Security Requirements

Security is explicitly part of evaluation, including XSS/CSRF protection, input sanitization, and tenant isolation.[cite:1] Therefore V1 must implement security as a core requirement, not a postscript.[cite:1]

Mandatory controls:
- Password hashing with modern algorithm.
- Secure session cookies.
- CSRF protection for auth and state-changing requests.[cite:1]
- Server-side authorization on every tenant-scoped query.[cite:1]
- Rich text sanitization for KB articles and email HTML.[cite:1]
- Rate limiting for login, widget messages, invite flows, AI summary requests, and domain verification attempts.[cite:1]
- XSS-safe rendering in widget, inbox, and KB pages.[cite:1]
- Audit logs for critical admin actions.

## 16. Analytics & Observability

Although analytics are listed as stretch, operational observability is necessary for debugging a live assignment deployment.[cite:1] The platform should at minimum log and surface:
- Message send failures.
- Inbound email parse failures.
- WebSocket connection errors.
- AI summary generation failures and latency.
- Domain verification attempts.
- Invite acceptance failures.

Minimal dashboard counters can include:
- Open conversations.
- Resolved conversations.
- Chat vs email volume.
- Average first response time if implemented.

## 17. Project Structure

A monorepo structure similar in clarity to the reference PRD is recommended.[file:1]

```text
app/
  (public)/
    page.tsx
    login/page.tsx
    signup/page.tsx
    help/[slug]/page.tsx
  (app)/
    inbox/page.tsx
    inbox/[conversationId]/page.tsx
    knowledge-base/page.tsx
    team/page.tsx
    settings/page.tsx
    domains/page.tsx
  api/
    auth/...
    conversations/...
    widget/...
    email/...
    kb/...
    domains/...
components/
  inbox/
  widget/
  kb/
  team/
  shared/
lib/
  auth/
  db/
  realtime/
  email/
  ai/
  domains/
  validation/
models or prisma/
workers/
public/
  widget-loader.js
```

## 18. Environment Variables

| Variable | Description |
|---|---|
| DATABASE_URL | Primary database connection |
| NEXTAUTH_SECRET or SESSION_SECRET | Session signing secret |
| APP_URL | Main app URL |
| WIDGET_URL | Widget script host URL |
| SMTP_HOST | SMTP provider host |
| SMTP_PORT | SMTP port |
| SMTP_USER | SMTP username |
| SMTP_PASS | SMTP password |
| INBOUND_EMAIL_SECRET | Webhook signature secret |
| LLM_API_KEY | AI summary provider key |
| REALTIME_PROVIDER_KEY | WebSocket / realtime provider key |
| DOMAIN_PROVIDER_TOKEN | Custom domain / DNS integration |
| FROM_EMAIL | Outbound support sender |

## 19. Build, Testing & Deployment

The assignment hard rule is that the product must be live and deployed or it is automatically rejected.[cite:1] Evaluators will test the product themselves, so deployment and QA are part of the product scope, not just engineering ops.[cite:1]

### 19.1 Required Deliverables
- Live app URL.[cite:1]
- Live chat bubble demo page.[cite:1]
- Working support email address that lands in inbox.[cite:1]
- GitHub repository with clean commit history and README.[cite:1]
- Submission sent by message and email to the listed contacts.[cite:1]

### 19.2 Testing Matrix
- Signup and workspace creation.
- Team invite acceptance.
- Widget chat send/receive in real time.
- Returning visitor history persistence.
- Inbound email creates conversation.
- Agent reply sends outbound email in same thread.
- Inbox filters by channel, status, assignee.
- Article creation and public KB search.
- Widget article suggestion behavior.
- AI summary generation on long thread.
- Custom domain setup state flow.

### 19.3 Deployment Target
- Vercel or equivalent for web app.
- Hosted database.
- Managed email provider.
- Managed realtime provider if faster to ship reliably.
- HTTPS-enabled public endpoints for widget and email webhooks.

## 20. V1 Scope — Explicit Inclusions / Exclusions

### 20.1 In Scope for Assignment V1
- Email/password auth.[cite:1]
- Workspace creation and team invites.[cite:1]
- Admin and Agent roles.[cite:1]
- Embeddable chat widget with persistent history.[cite:1]
- Real-time inbox communication.[cite:1]
- Incoming email to unified inbox.[cite:1]
- Outgoing email replies with threading.[cite:1]
- Unified inbox filters and statuses.[cite:1]
- Knowledge base authoring and public search.[cite:1]
- Widget article suggestions.[cite:1]
- AI issue summary generation.[cite:1]
- Custom domain connection flow.[cite:1]

### 20.2 Out of Scope or Stretch for V1
- Full CRM timeline enrichment.
- Deep analytics suite.
- Workflow automation rules.
- Advanced SLA dashboards.
- Public API and webhooks beyond core infra hooks.
- Multilingual knowledge base.
- Attachment-heavy email/file workflows unless time permits.

## 21. Trade-Off Notes for 48-Hour Execution

The assignment implicitly rewards strong trade-off decisions, not maximal feature fantasy.[cite:1] A successful implementation should prioritize working end-to-end flows over ornamental complexity, because evaluators care whether they can sign up, send messages, receive replies, and test each required capability themselves.[cite:1]

Recommended trade-off principles:
- Prefer one solid workspace model over multi-plan billing complexity.
- Prefer reliable managed services for realtime and email where they reduce failure risk.
- Prefer concise AI summaries over expensive agent copilots.
- Prefer a credible custom-domain workflow and state machine over unfinished low-level DNS automation.
- Prefer clean README documentation where a deeper production feature is intentionally stubbed.

## 22. Acceptance Criteria

The product is considered complete for assignment submission only when all of the following are true:
- A new evaluator can sign up and create a workspace without manual intervention.[cite:1]
- A teammate can be invited and join with role-based access.[cite:1]
- A website with one script tag can show the chat widget and create real conversations.[cite:1]
- Chat messages travel in real time between customer and agent.[cite:1]
- Returning widget users can see prior chat history.[cite:1]
- An external email sent to the provided support address appears in the unified inbox.[cite:1]
- Agent replies from dashboard reach the sender as standard email and remain threaded.[cite:1]
- Inbox filters by channel, assignee, and status function correctly.[cite:1]
- Knowledge base articles can be authored, published, and searched publicly.[cite:1]
- Widget suggests relevant articles for question-like input.[cite:1]
- Long conversations surface an AI-generated summary with current issue state.[cite:1]
- Custom-domain configuration flow is present and technically coherent.[cite:1]
- App is live, accessible, and usable by external testers.[cite:1]

