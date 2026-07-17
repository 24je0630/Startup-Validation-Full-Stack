# Signal — Startup Validation Platform

A platform for posting startup ideas and validating them with real signal:
votes, virtual investment, founder/backer feedback, team formation, and
market predictions — backed by an analytics dashboard for founders.

## Tech stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Backend:** Next.js API routes (Route Handlers)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (Phase 2)
- **Charts:** Recharts (Phase 8)

## Project status

This repo is being built in phases. See `docs/PROGRESS.md` (added once we
have more than one phase to track) for what's done.

- [x] Phase 1 — Project setup
- [x] Phase 2 — Authentication
- [x] Phase 3 — Idea posting
- [x] Phase 4 — Voting & credits
- [x] Phase 5 — Feedback system
- [x] Phase 6 — Team formation
- [x] Phase 7 — Prediction engine
- [x] Phase 8 — Analytics dashboard
- [ ] Phase 9 — Polish + deployment
- [ ] Phase 5 — Feedback system
- [ ] Phase 6 — Team formation
- [ ] Phase 7 — Prediction engine
- [ ] Phase 8 — Analytics dashboard
- [ ] Phase 9 — Polish + deployment

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` with your local or hosted PostgreSQL connection
string, and generate a `JWT_SECRET`:

```bash
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

This creates the `users` table and generates the Prisma Client.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Authentication

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
  protected paths (currently `/dashboard/*`, `/ideas/new`)

**Why JWT over NextAuth for this project:** the platform needs custom user
fields from day one (virtual `credits` balance, and founder/backer roles in
later phases) that live directly on our own `User` table, and every mutating
action (voting, investing, joining a team) is a first-party API route rather
than a third-party OAuth flow. A small, explicit JWT/cookie layer gives full
control over the session shape with no adapter config, at the cost of us
owning what NextAuth would otherwise handle (CSRF hardening, provider
plumbing) — worth revisiting if/when social login is added.

## Ideas

- `GET /api/ideas?page=1` — public, paginated (20/page), newest first, includes author name
- `POST /api/ideas` — requires auth; validated with the shared `createIdeaSchema`
- `GET /api/ideas/[id]` — public, 404s for missing or non-public ideas
- `/ideas` and `/ideas/[id]` are Server Components that query Prisma directly
  rather than calling the API routes above — the API exists for external/
  client consumers, but a Server Component hitting its own HTTP API is pure
  overhead
- `/ideas/new` is protected by `middleware.ts` (redirects to `/login`) and by
  a server-side check in the API route itself

## Voting

- `POST /api/votes` — body `{ ideaId, value: 1 | -1 }`, auth required
- One vote per user per idea (`@@unique([userId, ideaId])` on `Vote`).
  Casting the same direction again **removes** the vote (toggle off);
  casting the opposite direction flips it. The read-then-write runs inside
  a `$transaction` so a duplicate double-click can't create two rows.
- `GET /api/ideas` and `GET /api/ideas/[id]` include a `stats` object
  (`score`, `upvotes`, `downvotes`, `totalInvested`, `userVote`) computed by
  `src/lib/ideaStats.ts` in three batched `groupBy` queries — no N+1 per
  card in the feed.
- `<VoteButtons>` applies the vote optimistically, then reconciles with
  whatever the server actually persisted; on error it rolls back.

## Virtual investment

- Every user starts with **1000 credits** (`User.credits`, was 100 in Phase 2
  — bumped now that investment is live; existing rows keep whatever value
  they already have, only the default for *new* signups changes).
- `POST /api/invest` — body `{ ideaId, amount }`, auth required. The credit
  deduction is a single conditional `updateMany` (`WHERE credits >= amount`)
  inside a `$transaction`, so concurrent investment requests can't overdraw
  a balance — no explicit row lock needed, since the check and the write are
  the same atomic statement.
- **Multiple investments per user per idea are allowed** (no unique
  constraint on `Investment`), unlike votes. Rationale: investment is meant
  to represent growing conviction over time — a backer might put in 50
  credits today and another 100 next week — and each investment keeps its
  own timestamp, which the Phase 8 "interest over time" chart needs. A
  single-investment cap would force clunky "edit your investment" UX and
  destroy that time-series signal.
- `<InvestmentPanel>` shows live total funding and the user's remaining
  balance, updated from the API response after each investment.

## Feedback (comments)

- `POST /api/comments` — body `{ ideaId, content, parentId? }`, auth required
- `GET /api/comments?ideaId=...` — public, returns the full nested reply tree
  (also used directly by the idea detail Server Component via
  `getCommentTreeForIdea()`, same pattern as `ideaStats.ts`)
- `Comment.parentId` is a self-relation (`onDelete: Cascade`) — deleting a
  comment removes its replies rather than orphaning them
- Replies validate that `parentId` actually belongs to the same idea, so a
  client can't stitch a reply onto an unrelated thread
- Input is trimmed and length-capped (2000 chars) server-side; empty or
  whitespace-only comments are rejected. Content is rendered as plain text
  (`{comment.content}`, never `dangerouslySetInnerHTML`), so React's
  automatic escaping is the real XSS defense — the server-side stripping of
  control characters is just hygiene, not the security boundary
- `<CommentThread>` recurses to arbitrary depth but stops adding visual
  indent past 4 levels so deep chains don't push content off-screen

## Team formation

- Creating an idea automatically makes the author a `TeamMember` with
  `role: FOUNDER`, via a nested Prisma write on `POST /api/ideas` (atomic
  with idea creation — no separate step that could fail independently).
- `POST /api/join-request` — auth required. A user has exactly **one**
  `JoinRequest` row per idea for its lifetime (`@@unique([userId, ideaId])`):
  no existing row creates one as `PENDING`; a `REJECTED` row is reset back
  to `PENDING` (re-apply after being turned down); a `PENDING` or
  `ACCEPTED` row is left alone and the route returns `409`. This is what
  "cannot send multiple requests" means here — duplicates are impossible
  at the DB level, while re-application after rejection still works.
- `GET /api/join-request?ideaId=...` — **founder only** (checked against
  `idea.authorId`, `403` otherwise).
- `POST /api/join-request/respond` — founder only, `{ requestId, action }`.
  Rejects if the request isn't `PENDING` (already handled). Accepting flips
  the request to `ACCEPTED` and creates the `TeamMember` row in the same
  `$transaction`.
- `GET /api/team?ideaId=...` — public.
- `<TeamPanel>` shows the member list to everyone, a status-aware join
  control (request / pending / re-request after rejection) to the current
  viewer, and the pending-requests queue with accept/reject only when
  `myStatus.kind === 'founder'`.

## Prediction system

- `POST /api/predict` — body `{ ideaId, marketScore, feasibilityScore, riskScore }`
  (each 1–10), auth required. Uses `prisma.prediction.upsert` against
  `@@unique([userId, ideaId])`, so resubmitting always **updates** the same
  row — there's no code path that creates a second prediction for the same
  user+idea.
- `GET /api/predict?ideaId=...` — public, returns every individual
  prediction (for a future distribution chart) plus the aggregates.
- `GET /api/ideas` and `GET /api/ideas/[id]` include `predictionStats`
  alongside `stats`, computed by `src/lib/predictions.ts` in the same
  batched-`groupBy` style as `ideaStats.ts` — one query for all ideas on a
  page, not one per idea.

**Overall score formula** (`src/lib/scoring.ts`):

```
overall = market × 0.40 + feasibility × 0.35 + (11 − risk) × 0.25
```

All three inputs are 1–10 and the output is 1–10. Risk is **inverted** via
`(11 − risk)` before weighting — a risk rating of 1 (very low risk)
contributes near the maximum, a rating of 10 (very high risk) contributes
near the minimum — so every component is on the same "higher is better"
scale before the weights are applied; without the inversion, rating
something as *more* risky would confusingly *increase* the overall score.
Market and feasibility are weighted more heavily (40% + 35% vs. 25%)
because at the idea-validation stage, market size and buildability are the
stronger signals of whether something is worth pursuing — risk matters,
but shouldn't drag down an otherwise strong idea as much as a small market
or clear infeasibility would.

## Analytics dashboard

- `GET /api/analytics?ideaId=...` and `/ideas/[id]/analytics` — **founder
  only**, not just "any logged-in user." Analytics expose granular
  engagement timing (exactly when momentum is building or stalling) that a
  founder may not want public or visible to competing ideas, and the
  original brief specifically frames this as a founder tool ("Founders
  should track interest over time, view analytics, identify traction
  signals"). Non-founders (including logged-out visitors) are redirected
  back to the public idea page; the API returns `403`.
- `src/lib/analytics.ts` computes everything with **3 raw `GROUP BY`
  queries** (one each for votes/investments/comments, using
  `TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')` for a UTC-stable
  day key) plus 2 cheap `aggregate()` calls for the pre-window baseline —
  never by fetching every row and grouping in application code, so it
  stays fast regardless of how much activity an idea has.
- Indexes on `Vote`, `Investment`, and `Comment` were upgraded from
  `@@index([ideaId])` to `@@index([ideaId, createdAt])` (Phase 8) so the
  `WHERE ideaId = ? AND createdAt >= ?` date-range scans hit the index
  directly — a strict upgrade, since the composite index still serves any
  query that only filters by `ideaId`.
- **Vote trend accuracy note:** votes can be flipped or removed (Phase 4),
  and there's no separate append-only event log for them, so the vote trend
  is the *current* votes table grouped by each vote's *original* cast day —
  it always reconciles exactly to the current score, but a vote flipped
  later is still attributed to when it was first cast, not when it changed.
  **Investment trend has no such caveat** — investments are append-only, so
  its cumulative sum is an exact historical record.
- Window defaults to the last 30 days, or since the idea was posted if
  younger than that; missing days are filled with zero so the charts render
  continuous lines instead of gaps.
- `/ideas/[id]/analytics/loading.tsx` provides a skeleton (Next.js's
  built-in `loading.tsx` convention) shown automatically while the async
  Server Component fetches.

## Folder structure

```
src/
  app/              # Next.js App Router pages + API routes
    layout.tsx
    page.tsx
    globals.css
  components/       # Shared React components
  lib/              # Server-side utilities (Prisma client, auth helpers, etc.)
prisma/
  schema.prisma     # Database schema (grows with each phase)
```
