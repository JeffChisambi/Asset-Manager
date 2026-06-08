# Doorstep

Local marketplace app — buy, sell, and chat with neighbors using Expo (React Native) + Express API + PostgreSQL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 3000, workflow: "API Server")
- `pnpm --filter @workspace/doorstep-app run build:web` — export Expo web build to `dist/` (run before first serve, or after app code changes)
- `pnpm --filter @workspace/doorstep-app run serve` — serve Expo web build (port 5000, workflow: "Start application")
- `pnpm run typecheck` — full typecheck across all packages (must be clean before shipping)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to Postgres (dev only; always run after editing `lib/db/src/schema/index.ts`)
- `pnpm --filter @workspace/api-server run test` — run unit tests with Node 24's built-in test runner

## Required env vars

- `DATABASE_URL` — Postgres connection string
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `EXPO_PUBLIC_DOMAIN` — public dev domain (set at Expo build time for API proxy)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-rate-limit + Zod v4 validation
- DB: PostgreSQL + Drizzle ORM
- Auth: Supabase JWTs (verified server-side with 4-min TTL cache)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)
- Tests: Node 24 built-in `node:test` + `--experimental-strip-types`
- Mobile: Expo (React Native)

## Where things live

- `lib/db/src/schema/index.ts` — source of truth for all DB tables + indexes
- `artifacts/api-server/src/routes/chat.ts` — all chat API endpoints (auth, Zod validation, rate limiting)
- `artifacts/api-server/src/app.ts` — Express app setup (CORS, body limits, global error handler)
- `artifacts/api-server/src/tests/chat.test.ts` — 37 unit tests for validation schemas + parseSince
- `artifacts/doorstepApp/lib/api.ts` — `chatApiCall` helper + `ChatAuthError` class
- `artifacts/doorstepApp/context/ChatContext.tsx` — chat state, polling, logout on 401
- `artifacts/doorstepApp/app/login.tsx` — login + profile sync flow
- `artifacts/doorstepApp/services/profile/` — profile service + seed users

## Architecture decisions

- **Token verification cache**: Supabase JWT verification is cached per-token for 4 minutes to avoid hammering Supabase on every poll request. Cache is an in-memory `Map`; cleared on 401 from DB.
- **Rate limiting per route**: `/chat/messages` (send) is limited to 30 req/min; `/chat/poll` to 60 req/min; `/chat/profile/sync` to 10 req/min — all keyed by verified user ID, not IP.
- **Auth before validation**: `chatAuth` middleware runs before Zod validation, so invalid tokens get a 401 (not a 400) regardless of body shape.
- **Username uniqueness**: On profile sync, username conflict is handled by appending a random 4-digit suffix rather than erroring, ensuring the INSERT always succeeds.
- **DB unique constraints in schema**: `chat_members_conv_user_idx` and `chat_friend_requests_from_to_idx` are enforced at the DB level as unique indexes, preventing duplicate rows even under race conditions.

## Product

- Users can sign up / log in via Supabase auth, with a profile (username, avatar colour, bio)
- Real-time-style chat via polling (`/api/chat/poll`): 1-on-1 DMs and group conversations
- Friend requests: send, accept, reject, cancel
- Messages support text, images, voice, video, files, stickers, and contacts
- Listings / marketplace feed (Expo screens)

## Gotchas

- **Always `pnpm --filter @workspace/db run push` after changing `lib/db/src/schema/index.ts`** — Drizzle does not auto-migrate.
- **Rebuild Expo before restarting "Start application"**: `EXPO_PUBLIC_DOMAIN=<dev-domain> pnpm --filter @workspace/doorstep-app run build`
- **`pnpm run typecheck` must pass before any deploy** — the workspace typecheck catches cross-package type errors that individual package checks miss.
- **`api-server` tsconfig `types: ["node","pg"]`** — needed because `"types"` is restricted; adding a new `@types/*` package requires updating the array.
- **Tests use `node --test --experimental-strip-types`** — vitest/jest are not available. Tests live in `artifacts/api-server/src/tests/`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
