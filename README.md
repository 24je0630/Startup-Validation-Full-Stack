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
- [ ] Phase 3 — Idea posting
- [ ] Phase 4 — Voting & credits
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
