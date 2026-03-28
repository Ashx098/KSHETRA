# KSHETRA

KSHETRA is a deterministic life progression system built as a Bun monorepo with:

- `apps/web`: Next.js App Router frontend
- `apps/api`: NestJS REST API
- `packages/types`: shared TypeScript transport contracts
- `prisma/schema.prisma`: canonical schema and migration ownership

It is not a generic productivity app. System truth stays in the backend. XP, attributes, streaks, rank progress, valid-day checks, quest assignment, and audit history are authoritative server-side flows.

## Current Product Surface

Implemented through the current build phases:

- deterministic onboarding and persisted user state
- goals, attributes, profile, progression summary
- daily quest loop with quest templates, quest instances, quest completion
- audited XP ledger and user attribute history
- valid-day and streak evaluation
- streak milestone bonuses through separate ledger entries
- progression history endpoint
- custom SVG radar visualization on Home and Progress
- constrained AI planner path for daily quest generation with strict validation and deterministic fallback

## Tech Stack

- Package manager/runtime: Bun
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Shared contracts: workspace package in `packages/types`

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

1. Install dependencies

```bash
bun install
```

2. Create environment files

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

3. Generate Prisma client

```bash
bun run prisma:generate
```

4. Apply local migrations

```bash
bun run prisma:migrate
```

5. Seed base data

```bash
bun run prisma:seed
```

6. Run the API

```bash
bun run dev:api
```

7. Run the web app

```bash
bun run dev:web
```

## Root Scripts

- `bun run dev:web`
- `bun run dev:api`
- `bun run build`
- `bun run check`
- `bun run prisma:generate`
- `bun run prisma:migrate`
- `bun run prisma:seed`
- `bun run prisma:studio`

## Environment

Root and API env examples include:

- `DATABASE_URL`
- `API_PORT`
- `WEB_PORT`
- `WEB_ORIGIN`
- `NEXT_PUBLIC_API_BASE_URL`
- `AI_BASE_URL`
- `AI_MODEL`
- `AI_API_KEY`

The AI settings are optional until you want Phase 5 planner behavior to use your endpoint. Without them, quest generation safely falls back to deterministic template assignment.

## API Entry Points

- Health: `GET /api/v1/health`
- Profile: `GET /api/v1/me`
- Onboarding: `POST /api/v1/onboarding`
- Goals: `GET|POST|PATCH|DELETE /api/v1/goals`
- Attributes: `GET /api/v1/attributes`
- Progression summary: `GET /api/v1/progression/summary`
- Progression history: `GET /api/v1/progression/history`
- Daily quests: `GET /api/v1/quests/today`
- Quest completion: `POST /api/v1/quests/:questId/complete`

## Documentation

Project and implementation docs live in `docs/`. For an end-to-end local setup and architecture runbook, see [DEVELOPMENT-RUNBOOK.md](/Users/avinash.m/Projects/KSHETRA/docs/DEVELOPMENT-RUNBOOK.md).
