# ReachInbox Email Scheduler & Queue Engine

Production-grade, distributed "Email Scheduler" web application and background queue engine designed for high-throughput, fault-tolerant email dispatching with atomic rate limiting, restart safety, and full-text search.

---

## 🏛️ Architecture Overview

The system is engineered as an event-driven monorepo separating API ingestion, UI, and distributed background processing:

```
                                      +------------------------+
                                      |   Next.js 14 Web App   |
                                      |    (Tailwind + React)  |
                                      +-----------+------------+
                                                  |
                                                  | HTTPS / Session Cookies
                                                  v
                                      +------------------------+
                                      |   Express.js API Node  |
                                      | (Auth, Campaigns, ES)  |
                                      +-----+------------+-----+
                                            |            |
                     Atomic DB Transaction  |            | BullMQ Delayed Jobs
                                            v            v (jobId = email.id)
                  +-------------------------------+  +-------------------------------+
                  |      PostgreSQL Database      |  |         Redis (AOF ON)        |
                  |  (users, senders, campaigns,  |  |   - Delayed Queue             |
                  |              emails)          |  |   - Hourly Rate Limit Keys    |
                  +---------------+---------------+  |   - Last-Send Spacing Locks   |
                                  ^                  +---------------+---------------+
                                  |                                  |
                                  | Read scheduled / update status   | Pop delayed jobs
                                  |                                  v
                               +--+----------------------------------+---+
                               |     Dedicated BullMQ Worker Node        |
                               |  - Rate check: rl:{senderId}:{hourKey}  |
                               |  - Delay spacing: MIN_DELAY_MS          |
                               |  - Rescheduler: Next Hour Window        |
                               |  - Nodemailer + Ethereal SMTP           |
                               +--+-------------------+--------------+---+
                                  |                   |
               Async doc indexing |                   | Rate limit exceeded
                                  v                   v (ONCE per sender/hour)
                    +--------------------+    +--------------------+
                    |   Elasticsearch    |    |   Slack Webhook    |
                    | (emails index)     |    |  (chat:write API)  |
                    +--------------------+    +--------------------+
```

---

## 📂 Monorepo Structure

```
.
├── apps/
│   ├── api/                 # Node.js + Express + TypeScript REST API
│   │   ├── src/
│   │   │   ├── middleware/  # Auth (JWT/cookies), Centralized Error Handler
│   │   │   ├── routes/      # /auth (Google/Slack), /campaigns, /emails, /search, /admin/queues
│   │   │   └── index.ts     # Express app entrypoint & graceful shutdown
│   ├── web/                 # Next.js 14 (App Router) + React + TypeScript + Tailwind
│   │   ├── src/
│   │   │   ├── app/         # Page routes (Login, Dashboard)
│   │   │   ├── components/  # DashboardHeader, ComposeModal, UI components
│   │   │   └── lib/         # Typed API client
│   └── worker/              # Dedicated Node process running BullMQ workers
│       └── src/
│           ├── processor.ts # Rate limiting, spacing, Ethereal SMTP, Slack alert
│           └── index.ts     # Worker entrypoint (concurrency from env)
├── packages/
│   └── core/                # Shared library: Prisma DB, Redis, BullMQ, ES, Slack, Logger
│       ├── prisma/          # schema.prisma, SQL migrations
│       └── src/             # Types, config, db, redis, queue, ethereal, slack, elasticsearch
├── scripts/
│   ├── seed-50-demo.ts      # Creates 50 recipients to demo rate-limit rescheduling
│   └── test-restart-safety.ts # Automated crash & restart safety test
├── docker-compose.yml       # Postgres 16, Redis 7 (AOF ON), Elasticsearch 8
├── render.yaml              # Render blueprint (API Web Service + Worker Service + Postgres)
├── vercel.json              # Vercel deployment configuration
├── .env.example             # Exhaustive environment variable reference
└── README.md
```

---

## ⚙️ Core Technical Highlights

### 1. Queue Design & Staggered Scheduling
- **Zero Cron / Zero `setInterval`**: All email scheduling is orchestrated using BullMQ delayed jobs (`delay = Math.max(0, scheduledAt.getTime() - Date.now())`).
- **Idempotency**: Every BullMQ job is queued with `jobId = email.id`. If a job is re-added or retried, Redis guarantees that no duplicate jobs can exist.
- **Staggering**: Consecutive emails in a campaign are staggered across time:
  $$\text{scheduled\_at}_i = \text{startTime} + (i \times \text{delay\_seconds} \times 1000\text{ ms})$$
- **Atomic Insertion**: Uploaded CSVs and parsed recipients are validated, deduplicated, and inserted into PostgreSQL inside a **single database transaction** (`prisma.$transaction`).

### 2. Hourly Rate Limiting & Dynamic Rescheduling
- **Redis Atomic Counter**:
  - Key schema: `rl:sender:{senderId}:{YYYY-MM-DDTHH}` and `rl:global:{YYYY-MM-DDTHH}`.
  - On the first increment, an atomic `EXPIRE` is set to 7200 seconds (~2 hours).
- **Graceful Rescheduling (Never Drop or Fail)**:
  - When a sender or global limit is reached, the worker **never drops or fails** the email.
  - The job is moved to the **start of the next hour** ($HH+1\text{:00:00.000}$):
    $$\text{rescheduledTime} = \text{startOfNextHour} + \text{offset}$$
  - The PostgreSQL `scheduled_at` timestamp is updated in the database.
  - A staggered offset preserves the relative ordering of the overflow jobs.

### 3. Minimum Delay Between Sends (Per-Sender Limiting)
- **Why Custom Redis Counters vs BullMQ Built-in Limiter?**
  > **Note**: BullMQ's built-in `limiter` option applies queue-wide across all jobs in that queue. In a multi-tenant platform where multiple senders dispatch concurrently, a queue-wide limiter would throttle unrelated senders. To achieve true per-sender isolation, we enforce a custom Redis-based pacing lock:
  > - Key: `last_send:{senderId}`
  > - Before dispatching, the worker inspects the time elapsed since the sender's last send. If elapsed time $< \text{MIN\_DELAY\_MS}$ (default: `2000 ms`), the worker pauses for the remaining duration.

### 4. Restart Safety & Fault Tolerance
- **Strict Worker Startup**: On boot, the worker **only** starts listening to BullMQ queues. It **never** scans or recreates jobs from database rows.
- **Why No Duplicates / No Lost Jobs?**
  1. Redis runs with AOF persistence enabled (`--appendonly yes --appendfsync everysec`), preventing queue loss on server reboot.
  2. The database acts as the single source of truth for email status (`scheduled` $\rightarrow$ `sent` / `failed`).
  3. When a worker picks up a job, it executes:
     `if (email.status !== 'scheduled') return; // Exit without sending`
  4. The automated verification script (`npm run test:restart`) programmatically proves that killing the worker mid-batch and restarting causes 0 duplicate sends and 0 lost jobs.

### 5. Full-Text Search (Elasticsearch with PostgreSQL Fallback)
- Every email is indexed in Elasticsearch under the `emails` index upon creation and updated upon status transitions.
- The `GET /search?q=&status=` endpoint queries Elasticsearch using `multi_match` (fuzzy search across `recipient^3`, `subject^2`, `body`) with status filtering.
- If Elasticsearch is offline or unconfigured, the API seamlessly falls back to PostgreSQL `contains` / `ILIKE` without user impact.

### 6. Slack OAuth & Hourly Alert Debounce
- Users can connect their workspace via "Connect Slack" (`chat:write` scope).
- When a sender hits their hourly limit, a Slack alert is sent to their channel.
- A Redis key `slack_alert:{senderId}:{hourKey}` with `SETNX` and a 2-hour TTL guarantees that Slack alerts fire **at most once per sender per hour**, eliminating notification spam.

---

## 📋 Environment Configuration

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `PORT` | API server port | `4000` |
| `FRONTEND_URL` | Web client origin for CORS & redirect | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public` |
| `REDIS_URL` | Redis connection string (AOF enabled) | `redis://localhost:6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch host URL | `http://localhost:9200` |
| `ELASTICSEARCH_INDEX`| Elasticsearch index name | `emails` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | `mock_google_client_id` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | `mock_google_client_secret` |
| `GOOGLE_REDIRECT_URI` | Google OAuth callback URI | `http://localhost:4000/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | `your_slack_client_id` |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | `your_slack_client_secret` |
| `SLACK_REDIRECT_URI` | Slack App Redirect URI | `http://localhost:4000/auth/slack/callback` |
| `SESSION_SECRET` | Secret key for signing session tokens | `32+ character random secret` |
| `COOKIE_SECURE` | Set `true` in production (HTTPS) | `false` |
| `COOKIE_SAME_SITE` | Cookie SameSite policy (`lax`, `strict`, `none`) | `lax` (`none` in cross-domain prod) |
| `BULL_BOARD_USER` | Admin username for `/admin/queues` | `admin` |
| `BULL_BOARD_PASS` | Admin password for `/admin/queues` | `admin` |
| `MAX_EMAILS_PER_HOUR` | Global platform hourly email limit | `100` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Per-sender hourly email limit | `20` |
| `WORKER_CONCURRENCY` | Concurrent jobs per worker instance | `5` |
| `MIN_DELAY_MS` | Minimum delay between sends per sender | `2000` |
| `NEXT_PUBLIC_API_URL` | API Base URL for Next.js frontend | `http://localhost:4000` |

---

## 🚀 Local Quickstart

### Step 1: Clone & Configure
```bash
cp .env.example .env
npm install
```

### Step 2: Start Local Infrastructure (Docker Compose)
Starts PostgreSQL, Redis with AOF persistence, and Elasticsearch:
```bash
docker compose up -d
```

### Step 3: Run Database Migrations
```bash
npm run db:push
```

### Step 4: Run Services Concurrently
In separate terminals (or using your process manager):
```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Background BullMQ Worker
npm run dev:worker

# Terminal 3: Next.js Frontend
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Demonstration & Test Scripts

### 1. 50-Recipient Rate-Limiting & Rescheduling Demo
Run the seed script to create a campaign with 50 recipients and an hourly limit of 10:
```bash
npm run seed
```
- The first 10 emails are processed and delivered via Ethereal SMTP.
- Emails 11 through 50 detect the rate limit, trigger a Slack alert, and are automatically rescheduled to the start of the next hour.
- Check the Bull Board at [http://localhost:4000/admin/queues](http://localhost:4000/admin/queues) (User: `admin`, Pass: `admin`).

### 2. Restart Safety Automated Test
Run the automated test proving zero email loss and zero duplicate sends across worker crashes:
```bash
npm run test:restart
```

---

## 🌐 Production Deployment Guide

### Recommended Free-Tier Stack
- **Frontend**: [Vercel](https://vercel.com)
- **API & Worker**: [Render](https://render.com) (1 Web Service + 1 Background Worker)
- **PostgreSQL**: [Neon](https://neon.tech) (Serverless Postgres)
- **Redis**: [Upstash Redis](https://upstash.com) (Ensure eviction policy is set to `noeviction` for BullMQ)
- **Elasticsearch**: [Bonsai Elasticsearch](https://bonsai.io) or Elastic Cloud Free Trial

### Manual Setup Checklist
1. **Google Cloud OAuth**:
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Authorized Javascript origins: `https://your-app.vercel.app`
   - Authorized redirect URIs: `https://your-api.onrender.com/auth/google/callback`
   - Copy Client ID and Secret to your Render environment variables.
2. **Slack App (Optional Alert Integration)**:
   - Go to [Slack API Apps](https://api.slack.com/apps).
   - Create an App $\rightarrow$ "OAuth & Permissions".
   - Add Bot Token Scope: `chat:write`.
   - Set Redirect URL: `https://your-api.onrender.com/auth/slack/callback`.
3. **Cross-Domain Cookie Configuration**:
   - When deploying frontend on Vercel (`*.vercel.app`) and API on Render (`*.onrender.com`), set:
     - `COOKIE_SECURE=true`
     - `COOKIE_SAME_SITE=none`
     - `COOKIE_DOMAIN=` (leave empty so cookie scopes to API origin)
   - The Express API is pre-configured with `app.set('trust proxy', 1)` to allow secure SameSite=None cookies across reverse proxies.

---

## ⏱️ 2-Minute Interview Demo Walkthrough

1. **Sign In**: Navigate to the Web App. Click **"Sign in as Demo Candidate"** for instant 1-click evaluation, or click **"Sign in with Google"**.
2. **Review Sender Configuration**: The dashboard header automatically displays the active Ethereal SMTP account provisioned for your user.
3. **Inspect Bull Board**: Click the **"Bull Board"** button in the header (Login: `admin` / `admin`). Notice the real-time queues.
4. **Schedule a Campaign**:
   - Click **"Compose New Email"**.
   - Enter Subject & Body.
   - Upload a sample CSV or paste 10 recipient emails.
   - Watch the live validation counter update in real-time.
   - Set delay to 2 seconds and click **"Schedule Emails"**.
5. **Observe Real-Time Dispatch**:
   - In the **"Scheduled Emails"** tab, watch pending jobs countdown.
   - Switch to **"Sent Delivery Log"** tab: view delivered emails and click **"View Ethereal Email"** to inspect rendered message previews on Ethereal webmail.
6. **Full-Text Search**:
   - Type any keyword into the search bar. Observe instant results queried from Elasticsearch.
7. **Rate Limit Rescheduling**:
   - Run `npm run seed` in your terminal to dispatch 50 emails against a 10-per-hour limit.
   - Observe emails 11-50 move to the start of the next hour in Bull Board and PostgreSQL.

---

## ⚖️ Honest Limitations & Design Trade-offs

1. **Ethereal Fake SMTP Delivery**:
   - Ethereal SMTP is an ephemeral test inbox designed for demonstration. Emails do not land in actual user inboxes, but generate clickable preview URLs (`nodemailer.getTestMessageUrl(info)`).
2. **BullMQ Limiter Scope**:
   - BullMQ's native limiter is queue-wide. We resolved this by implementing per-sender Redis locks (`last_send:{senderId}`) and atomic hourly bucket counters (`rl:sender:{senderId}:{hourKey}`).
3. **Free-Tier Worker Sleep on Render**:
   - Free Render web services spin down after 15 minutes of inactivity. For continuous 24/7 delayed processing without cold starts, deploy the worker as a Render Background Worker or paid plan.
4. **Elasticsearch Cluster Sizing**:
   - Single-node Elasticsearch without security enabled is configured for development. In enterprise production, Elasticsearch should use TLS certificates and an index lifecycle management (ILM) rollover policy.
