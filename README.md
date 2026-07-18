# Signal — Startup Validation Platform

Post a startup idea. Let the crowd tell you whether it's worth building —
through votes, virtual investment, feedback, team formation, and market
predictions — before you spend a single week writing code. Founders get a
private analytics dashboard to track traction over time.

**Status:** All 9 planned phases complete. Production-ready pending your own
deployment (see below).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Screenshots](#screenshots)
- [Local setup](#local-setup)
- [Deployment](#deployment)
- [Architecture & design decisions](#architecture--design-decisions)
- [Known limitations & future improvements](#known-limitations--future-improvements)
- [Project structure](#project-structure)

---

## Features

| Area | What it does |
|---|---|
| **Auth** | Email/password signup & login, httpOnly JWT session cookie, protected routes |
| **Ideas** | Post, browse (paginated), and view startup ideas with tags & category |
| **Voting** | Upvote/downvote with toggle-off, one vote per user per idea |
| **Virtual investment** | Every user starts with 1000 credits; invest in ideas you believe in |
| **Feedback** | Threaded comments with unlimited-depth replies, paginated |
| **Team formation** | Request to join an idea's team; founder approves/rejects |
| **Predictions** | Rate market potential, feasibility, and risk (1–10); crowd-aggregated overall score |
| **Analytics dashboard** | Founder-only traction charts: vote trend, investment trend, daily activity |
| **Notifications** | In-app bell with unread badge for comments, investments, and team activity on your ideas |
| **Polish** | Toast feedback, empty/error/loading states, global error boundary, custom 404 |

## Tech stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js Route Handlers (no separate Express server)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT in an httpOnly cookie, signed/verified with [`jose`](https://github.com/panva/jose) (edge-compatible)
- **Charts:** Recharts
- **Validation:** Zod, shared between client forms and server routes

## Screenshots

> Placeholders — replace with real screenshots once deployed.

| Ideas feed | Idea detail | Analytics dashboard |
|---|---|---|
| `docs/screenshots/feed.png` | `docs/screenshots/detail.png` | `docs/screenshots/analytics.png` |

To add real ones: run the app, take screenshots, drop them in `docs/screenshots/`,
and update the paths above.

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Prisma format) |
| `JWT_SECRET` | Random secret for signing session tokens — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (used for metadata); `http://localhost:3000` locally |

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

This applies every migration and generates the Prisma Client. (If you're
starting from an earlier phase's migration history, just run
`npx prisma migrate dev` to pick up anything new.)

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Inspect the database

```bash
npm run prisma:studio
```

---

## Deployment

**Frontend + backend:** [Vercel](https://vercel.com) (zero-config for Next.js).
**Database:** [Neon](https://neon.tech) or [Supabase](https://supabase.com) (both have a free Postgres tier); Railway works too.

### Step 1 — Provision the database

1. Create a project on Neon (or Supabase/Railway).
2. Copy the connection string. For Neon, use the **pooled** connection string
   (it has `-pooler` in the hostname) — Vercel's serverless functions open
   many short-lived connections, and Neon's pooler handles that far better
   than a direct connection.
3. Keep this connection string handy — you'll need it in Step 3.

### Step 2 — Push the code to GitHub

```bash
git add .
git commit -m "chore: prepare for deployment"
git push origin main
```

(Repo: `https://github.com/24je0630/Startup-Validation-Full-Stack`)

### Step 3 — Import into Vercel

1. [vercel.com/new](https://vercel.com/new) → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. **Build command:** leave as default (`next build`) — `prisma generate`
   already runs automatically via the `postinstall` script in `package.json`.
4. **Environment variables** — add these in the Vercel project settings
   (Settings → Environment Variables), for both **Production** and
   **Preview**:

   ```
   DATABASE_URL=<your pooled Neon/Supabase connection string>
   JWT_SECRET=<output of: openssl rand -base64 32>
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
   ```

5. Click **Deploy**.

### Step 4 — Apply database migrations

Vercel's build step does **not** run `prisma migrate deploy` automatically —
and it shouldn't, since you don't want migrations racing on every preview
deploy. Run it once, manually, pointed at production:

```bash
DATABASE_URL="<your production connection string>" npx prisma migrate deploy
```

Do this once after the first deploy, and again after any deploy that adds a
new migration. (`migrate deploy` — not `migrate dev` — is the correct
command for production: it applies existing migrations without trying to
generate new ones or prompt interactively.)

### Step 5 — Verify

Visit your Vercel URL, sign up, post an idea, and confirm votes/investments/
comments/notifications all work end-to-end against the real database.

### Redeploying after schema changes

1. `npx prisma migrate dev --name <description>` locally to create the migration.
2. Commit and push — Vercel redeploys automatically.
3. Run `prisma migrate deploy` against production (Step 4) — do this
   **before** the new code that depends on the schema change goes live if
   the migration is additive-safe to run ahead of time, or immediately after
   deploy if not. For this project's migration history, all changes so far
   are additive (new tables/columns/indexes), so running deploy either just
   before or just after is safe.

---

## Architecture & design decisions

Everything below was written as each phase was built and documents the
non-obvious choices — why JWT instead of NextAuth, why investments allow
multiples but votes don't, the exact overall-score formula, etc.

### Authentication

Credentials-based auth using signed JWTs in an **httpOnly cookie**
(`session_token`), verified with [`jose`](https://github.com/panva/jose) so
the same verification code works in both Route Handlers and Edge
`middleware.ts`.

- `src/lib/jwt.ts` — edge-safe: cookie name, JWT sign/verify (`jose`).
  Imported by `middleware.ts`, so it's kept free of Node-only dependencies.
- `src/lib/password.ts` — Node-only: bcrypt hash/verify. Used exclusively by
  the signup/login Route Handlers, never by middleware.
- `POST /api/auth/signup` — create account, hash password (bcrypt), issue cookie
- `POST /api/auth/login` — verify credentials, issue cookie
- `POST /api/auth/logout` — clear cookie
- `GET /api/auth/me` — return current user (or `null`)
- `middleware.ts` — redirects unauthenticated requests to `/login` for
  protected paths (`/dashboard/*`, `/ideas/new`, `/ideas/*/analytics`)

**Why JWT over NextAuth:** the platform needs custom user fields from day one
(virtual `credits` balance, founder/backer roles) that live directly on our
own `User` table, and every mutating action (voting, investing, joining a
team) is a first-party API route rather than a third-party OAuth flow. A
small, explicit JWT/cookie layer gives full control over the session shape
with no adapter config, at the cost of us owning what NextAuth would
otherwise handle (CSRF hardening, provider plumbing) — worth revisiting if
social login is ever added.

### Ideas

- `GET /api/ideas?page=1` — public, paginated (20/page), newest first,
  includes author name, vote/investment stats, and prediction stats
- `POST /api/ideas` — requires auth; validated with the shared
  `createIdeaSchema`; also creates the founder's `TeamMember` row in the
  same nested write
- `GET /api/ideas/[id]` — public, 404s for missing or non-public ideas
- `/ideas` and `/ideas/[id]` are Server Components that query Prisma
  directly rather than calling the API routes above, avoiding a pointless
  self-fetch — the API routes exist for external/client consumers
- `/ideas/new` is protected by `middleware.ts` and by a server-side check in
  the API route itself

### Voting

- `POST /api/votes` — body `{ ideaId, value: 1 | -1 }`, auth required
- One vote per user per idea (`@@unique([userId, ideaId])` on `Vote`).
  Casting the same direction again **removes** the vote (toggle off);
  casting the opposite direction flips it. The read-then-write runs inside
  a `$transaction` so a duplicate double-click can't create two rows.
- Vote/investment/prediction stats are computed by three separate
  `lib/*Stats.ts` helpers, each using batched `groupBy` queries — no N+1 per
  card in the feed.
- `<VoteButtons>` applies the vote optimistically, then reconciles with
  whatever the server actually persisted; on error it rolls back.

### Virtual investment

- Every user starts with **1000 credits**.
- `POST /api/invest` — body `{ ideaId, amount }`, auth required. The credit
  deduction is a single conditional `updateMany` (`WHERE credits >= amount`)
  inside a `$transaction`, so concurrent investment requests can't overdraw
  a balance — no explicit row lock needed, since the check and the write are
  the same atomic statement.
- **Multiple investments per user per idea are allowed** (no unique
  constraint on `Investment`), unlike votes. Investment is meant to
  represent growing conviction over time — a backer might put in 50 credits
  today and another 100 next week — and each investment keeps its own
  timestamp, which the analytics "interest over time" chart needs. A
  single-investment cap would force clunky "edit your investment" UX and
  destroy that time-series signal.

### Feedback (comments)

- `POST /api/comments` — body `{ ideaId, content, parentId? }`, auth
  required; notifies the idea's founder, and separately the specific person
  being replied to (if different)
- `GET /api/comments?ideaId=...&skip=0` — public, **paginated at the root
  level**: each page returns a fixed number of top-level comments (newest
  first) along with the *complete* reply tree under each — never a flat
  row-count split that could sever a conversation mid-thread. Implemented
  by paginating `parentId: null` rows, then walking descendants level by
  level (bounded by actual reply depth, not total comment volume).
- `Comment.parentId` is a self-relation (`onDelete: Cascade`) — deleting a
  comment removes its replies rather than orphaning them.
- Replies validate that `parentId` actually belongs to the same idea.
- Input is trimmed and length-capped (2000 chars) server-side; empty or
  whitespace-only comments are rejected. Content renders as plain text
  (`{comment.content}`, never `dangerouslySetInnerHTML`), so React's
  automatic escaping is the real XSS defense.

### Team formation

- Creating an idea automatically makes the author a `TeamMember` with
  `role: FOUNDER`, via a nested Prisma write on `POST /api/ideas`.
- `POST /api/join-request` — auth required; notifies the founder. A user has
  exactly **one** `JoinRequest` row per idea for its lifetime
  (`@@unique([userId, ideaId])`): no existing row creates one as `PENDING`;
  a `REJECTED` row is reset back to `PENDING` (re-apply after rejection); a
  `PENDING`/`ACCEPTED` row is left alone and the route returns `409`.
- `GET /api/join-request?ideaId=...` — **founder only**.
- `POST /api/join-request/respond` — founder only; notifies the requester on
  both accept and reject. Accepting flips the request to `ACCEPTED` and
  creates the `TeamMember` row in the same `$transaction`.
- `GET /api/team?ideaId=...` — public.

### Prediction system

- `POST /api/predict` — body `{ ideaId, marketScore, feasibilityScore, riskScore }`
  (each 1–10), auth required. Uses `prisma.prediction.upsert`, so
  resubmitting always **updates** the same row.
- `GET /api/predict?ideaId=...` — public, individual predictions + aggregates.

**Overall score formula** (`src/lib/scoring.ts`):

```
overall = market × 0.40 + feasibility × 0.35 + (11 − risk) × 0.25
```

All three inputs are 1–10 and the output is 1–10. Risk is **inverted** via
`(11 − risk)` before weighting — a risk rating of 1 (very low risk)
contributes near the maximum, a rating of 10 (very high risk) contributes
near the minimum — so every component is on the same "higher is better"
scale before the weights are applied. Market and feasibility are weighted
more heavily (40% + 35% vs. 25%) because at the idea-validation stage,
market size and buildability are the stronger signals of whether something
is worth pursuing — risk matters, but shouldn't drag down an otherwise
strong idea as much as a small market or clear infeasibility would.

### Analytics dashboard

- `GET /api/analytics?ideaId=...` and `/ideas/[id]/analytics` — **founder
  only**, not just "any logged-in user." Analytics expose granular
  engagement timing that a founder may not want public, and the original
  brief frames this as a founder tool. Non-founders are redirected back to
  the public idea page; the API returns `403`.
- `src/lib/analytics.ts` computes everything with **3 raw `GROUP BY`
  queries** (votes/investments/comments by day) plus 2 cheap `aggregate()`
  calls for the pre-window baseline — never by fetching every row and
  grouping in application code.
- `Vote`/`Investment`/`Comment` indexes are composite `[ideaId, createdAt]`
  so the date-range scans hit the index directly.
- **Vote trend accuracy note:** votes can be flipped or removed, and there's
  no separate append-only event log, so the vote trend is the *current*
  votes table grouped by each vote's *original* cast day — it always
  reconciles exactly to the current score, but a vote flipped later stays
  attributed to when it was first cast. **Investment trend has no such
  caveat** — investments are append-only, so its cumulative sum is exact.
- Window defaults to the last 30 days, or since the idea was posted if
  younger; missing days are filled with zero for continuous chart lines.

### Notifications

- `Notification` model: `message`, optional `link`, `read`, `createdAt`.
- `src/lib/notifications.ts` — `notify({ userId, actorId, message, link })`
  is best-effort (a failed insert never breaks the action that triggered
  it) and self-notification-proof (`actorId === userId` is silently
  skipped — you never get notified about your own actions).
- Triggers: new comment on your idea (+ reply-to-you specifically), new
  investment in your idea, new join request on your idea, your join request
  accepted/rejected.
- `GET /api/notifications` — recent 20 + unread count.
- `POST /api/notifications/mark-read` — mark one (ownership-checked) or all.
- `<NotificationBell>` in the navbar: unread badge, dropdown, click-outside
  to close, optimistic mark-as-read.

### UI/UX polish

- **Toasts:** `<ToastProvider>` + `useToast()` wraps the whole app (root
  layout), used for success feedback on comments, investments, predictions,
  and team actions. Auto-dismisses after 4s.
- **Error boundaries:** `error.tsx` (route-segment errors, Navbar stays
  visible) and `global-error.tsx` (root-layout errors, per Next.js
  convention, renders its own `<html>/<body>`).
- **404:** custom `not-found.tsx`.
- **Loading states:** `loading.tsx` skeletons for `/ideas`, `/ideas/[id]`,
  and `/ideas/[id]/analytics`, shown automatically by Next.js while the
  async Server Component fetches — no client-side spinner logic needed.
- **Empty states:** every list (ideas feed, comments, team requests,
  notifications, predictions) has a distinct "nothing here yet" message
  rather than a blank space.

---

## Known limitations & future improvements

Honest gaps, not hidden:

- **Comment pagination reply-visibility edge case:** after posting a new
  reply, the UI resets to page 1 of root comments (newest first). If your
  reply was on an old thread that's now on page 2+, you won't see it update
  in place until you click "Load more" enough times to reach it. A future
  fix: track and preserve which pages are currently loaded across a refresh
  instead of resetting to page 1.
- **Vote trend uses original cast date, not last-changed date** (see the
  Analytics section above) — accurate for the current score, but not a full
  audit log of vote *changes* over time. Adding one would mean a separate
  append-only `VoteEvent` table.
- **No rate limiting** on any endpoint — fine for a demo/portfolio project,
  not for a real public launch. Add a rate limiter (e.g. Upstash Ratelimit)
  in front of mutating routes before going live for real.
- **No email notifications**, only in-app — a natural Phase 10 addition
  (e.g. Resend or Postmark) for founders who aren't actively browsing.
- **No image uploads** — ideas are text-only. Adding a cover image would
  need object storage (S3/R2) and a signed-upload flow.
- **Single-currency credits, no real payments** — intentional, this is
  virtual investment for signal purposes only, not a real funding mechanism.
- **Trending/leaderboard algorithm** — not built. Would combine recent vote
  velocity, investment velocity, and prediction score into a single ranking
  for a "Trending now" view of the ideas feed.
- **AI feedback summarizer** — not built. Would summarize a long comment
  thread into 2-3 sentences, shown at the top of the feedback section on
  ideas with many comments.
- **Search** — the ideas feed has no search/filter by category or tag yet,
  only pagination.

## Project structure

```
src/
  app/
    api/                  # Route Handlers (auth, ideas, votes, invest,
                           # comments, join-request, team, predict,
                           # analytics, notifications)
    ideas/
      [id]/
        analytics/        # founder-only dashboard
        page.tsx          # idea detail
      new/                # idea creation form
      page.tsx            # ideas feed
    dashboard/             # logged-in landing page
    login/ signup/
    layout.tsx             # Navbar + ToastProvider wrap every page
    error.tsx  global-error.tsx  not-found.tsx
  components/              # Shared React components (mostly client
                            # components that receive server-fetched data
                            # as props)
  lib/                     # Server-side utilities: prisma client, auth,
                            # validation schemas, and one aggregation helper
                            # per feature (ideaStats, predictions, comments,
                            # team, analytics, notifications)
middleware.ts               # Edge auth check for protected routes
prisma/
  schema.prisma              # Full data model — grew feature-by-feature
```
