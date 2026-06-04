---
name: Chat production setup
description: Architecture decisions for the productionalized Doorstep chat feature
---

## Key decisions

**Auth**: Chat API routes verify Supabase JWTs by calling `${SUPABASE_URL}/auth/v1/user` with `apikey: SUPABASE_ANON_KEY`. Token stored in AsyncStorage as `chatAuthToken`.

**API routing**: `serve.js` (port 5000) proxies all `/api/*` to `localhost:3000` (API server). `getApiBase()` in `lib/api.ts` returns `window.location.origin` on web (works via proxy) or `https://${EXPO_PUBLIC_DOMAIN}` on mobile.

**Schema**: 5 new tables in `lib/db/src/schema/index.ts` — `chat_profiles`, `chat_friend_requests`, `chat_conversations`, `chat_members`, `chat_messages`. All use Supabase UUIDs (text) as PKs except serial IDs for friend_requests and members.

**ChatContext**: Rewrote to use API polling (5s interval via refs for stable closures). `searchUsers` is now async. `setCurrentUser(user, token?)` accepts optional token to boot the data load. Exposes `ensureDirectConversation(friendId)` as async alternative to sync `getOrCreateDirectConversation`.

**SEED_USERS**: Still exported as `[]` for backward compat — do not remove the export.

**Stories**: Local-only (AsyncStorage) — not in the DB. Supabase storage bucket `chat_attachments` for media uploads.

**Why polling over WebSockets**: Simpler for MVP; `GET /api/chat/poll?since={ts}` returns new messages + friend request updates since the last timestamp.
