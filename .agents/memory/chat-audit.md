---
name: Chat API production audit
description: Security, correctness, and DB fixes applied to the chat API — patterns to maintain
---

## Fixes applied

**Security**
- Supabase JWT verification is now cached per-token for 4 min (in-memory Map) — prevents hammering Supabase on every poll tick
- Rate limiting added via `express-rate-limit`: send=30/min, poll=60/min, profile-sync=10/min; keyed by verified user ID not IP
- Body size limited to 2 MB in `app.ts`; CORS split dev/prod
- Global Express error handler in `app.ts` — prevents raw stack traces leaking to clients

**Correctness**
- `chatAuth` is now a proper async middleware (was not awaiting Supabase verify)
- `since` query param uses `parseSince()` with NaN + negative guard (was crashing on `?since=abc`)
- Members routes now check `req.userId` against conversation membership before returning data
- All chat endpoints validated with Zod schemas (body + query)
- Client: `chatApiCall` throws `ChatAuthError` on 401; ChatContext handles it with logout + state clear
- Login flow: awaits profile sync and uses server-returned username (not randomly generated client-side)

**DB**
- Added `uniqueIndex("chat_members_conv_user_idx")` — prevents duplicate membership rows
- Added `uniqueIndex("chat_friend_requests_from_to_idx")` — prevents duplicate requests
- Added non-unique indexes on messages (conv+created), members user_id, friend_requests (updated_at, to_id)
- Username conflict on profile sync: appends 4-digit suffix instead of erroring

**Tests**
- 37 unit tests in `artifacts/api-server/src/tests/chat.test.ts` using `node:test`
- Covers: parseSince (8), ProfileSyncSchema (8), FriendRequestSchema (3), FriendRequestActionSchema (5), SendMessageSchema (8), GroupConvSchema (5)
- Run with: `pnpm --filter @workspace/api-server run test`

**How to apply:**
- Any new chat endpoint must: (1) run `chatAuth` first, (2) validate body with Zod, (3) check membership/ownership
- Any change to DB schema must be followed by `pnpm --filter @workspace/db run push`
- api-server tsconfig restricts `types` array — adding a new @types/* package requires updating `tsconfig.json`
