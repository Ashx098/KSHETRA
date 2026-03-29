# KSHETRA

KSHETRA is a life progression game built as a Bun monorepo.

It is not a generic tracker and it is not a frontend-driven dashboard. The backend owns progression truth: quest assignment, XP, attribute movement, valid-day checks, streaks, events, dungeon progress, raid rewards, and audit history all resolve server-side.

## What The Product Is

KSHETRA turns daily life into a structured progression loop:

- `Home`: the daily command surface
- `Progress`: rank, streak, radar state, and history
- `Missions`: longer arcs through dungeons and raids
- `Profile`: identity, goals, reset context, and preferences

The current system includes:

- onboarding and persisted player state
- daily quest generation with deterministic fallback and constrained AI planning
- XP ledger and attribute history audit trails
- valid-day and streak evaluation
- milestone bonuses
- bounded mystery and recovery events
- medium-term dungeons
- heavier raids with verification summary flow
- in-app notifications
- companion guide support

## Core Game Loops

### Daily loop

Each system day generates:

- `3 mandatory` quests
- `2 optional` quests
- `1 stretch` quest

Completing quests grants:

- XP through `xp_ledger`
- attribute changes through `user_attribute_history`

Daily bundles are generated once per system day, not on every refresh. The system currently uses a local `8:00 AM` reset boundary per user timezone.

### Attributes

KSHETRA tracks six attributes:

- `Strength`
- `Wisdom`
- `Focus`
- `Mastery`
- `Wealth`
- `Bond`

Attributes move through deterministic backend-owned mappings from quest, event, dungeon, and raid completions. The frontend visualizes state, but does not invent progression logic.

### Events

Events are rare, bounded interventions:

- `recovery` events help salvage messy days
- `mystery` events add controlled surprise

They are optional, dismissible, auditable, and they never replace the core quest loop.

### Dungeons

Dungeons are medium-term structured challenges:

- heavier than quests
- multi-session
- tracked through explicit objectives

They add weekly pressure without replacing daily play.

### Raids

Raids are major milestone arcs:

- heavier than dungeons
- require multi-step objective closure
- require a real verification summary before completion rewards are released

They are designed to feel significant, not routine.

### AI role

AI is constrained and advisory only.

It may:

- help select from approved quest templates
- help explain state through the companion guide

It may not:

- invent gameplay rules
- mutate progression state directly
- bypass backend validation

If AI output is invalid or unavailable, the backend falls back safely to deterministic generation.

## Tech Stack

- Runtime and package manager: `Bun`
- Frontend: `Next.js`, `React`, `TypeScript`, `Tailwind CSS`
- Backend: `NestJS`
- Database: `PostgreSQL`
- ORM: `Prisma`
- Shared contracts: `packages/types`

## Repository Layout

```text
KSHETRA/
  apps/
    api/
    web/
  packages/
    types/
  prisma/
    migrations/
    schema.prisma
    seed.ts
  docs/
```

## Local Setup

### 1. Install dependencies

```bash
cd /Users/avinash.m/Projects/KSHETRA
bun install
```

### 2. Create environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Start PostgreSQL

If you use Docker or OrbStack:

```bash
docker start kshetra-postgres || docker run -d \
  --name kshetra-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=kshetra \
  -p 5432:5432 \
  postgres:16
```

### 4. Generate Prisma client, migrate, and seed

```bash
bun run prisma:generate
bun run prisma:migrate
bun run prisma:seed
```

### 5. Start the API

```bash
bun run dev:api
```

### 6. Start the web app

In another terminal:

```bash
bun run dev:web
```

### 7. Open the app

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

## Common Commands

- `bun run dev:web`
- `bun run dev:api`
- `bun run build`
- `bun run check`
- `bun run prisma:generate`
- `bun run prisma:migrate`
- `bun run prisma:seed`
- `bun run prisma:studio`

## Environment

Important env keys:

- `DATABASE_URL`
- `API_PORT`
- `WEB_PORT`
- `WEB_ORIGIN`
- `NEXT_PUBLIC_API_BASE_URL`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`

AI env values are optional until you want planner and guide behavior to use a live model. If AI is not configured or the model fails validation, KSHETRA keeps working through deterministic fallback behavior.

## API Surface

Key routes in the current build:

- `GET /api/v1/health`
- `GET /api/v1/me`
- `POST /api/v1/onboarding`
- `GET|POST|PATCH|DELETE /api/v1/goals`
- `GET /api/v1/home`
- `GET /api/v1/progression/summary`
- `GET /api/v1/progression/history`
- `GET /api/v1/missions`
- `GET /api/v1/quests/today`
- `POST /api/v1/quests/:questId/complete`
- `GET /api/v1/events/active`
- `POST /api/v1/events/:eventId/complete`
- `POST /api/v1/events/:eventId/dismiss`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:notificationId/dismiss`
- `GET /api/v1/guide/preferences`
- `PATCH /api/v1/guide/preferences`
- `POST /api/v1/guide/ask`

## Documentation

Docs live in `/Users/avinash.m/Projects/KSHETRA/docs`.

Useful starting points:

- [DEVELOPMENT-RUNBOOK.md](/Users/avinash.m/Projects/KSHETRA/docs/DEVELOPMENT-RUNBOOK.md)
- [FUTURE-PLAN.md](/Users/avinash.m/Projects/KSHETRA/docs/FUTURE-PLAN.md)

## Operating Principles

KSHETRA should stay:

- grounded
- auditable
- difficult to exploit
- AI-assisted only where safe
- visually expressive without becoming noisy

If a new feature makes the system less clear, less traceable, or less deterministic, it is the wrong feature at the wrong time.
