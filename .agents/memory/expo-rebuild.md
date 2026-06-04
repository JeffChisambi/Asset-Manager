---
name: Expo rebuild process
description: How to rebuild the Expo static bundle for the Doorstep app
---

## Process

```bash
EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN pnpm --filter @workspace/kinetic-shoes run build
```

Then restart the "Start application" workflow so serve.js picks up the new `static-build/` folder.

**Why EXPO_PUBLIC_DOMAIN matters**: The build.js script reads this env var and bakes it into the Metro bundle as `process.env.EXPO_PUBLIC_DOMAIN`. On mobile (React Native), `getApiBase()` in `lib/api.ts` uses this to construct API URLs. On web, it falls back to `window.location.origin` so the proxy works without rebuilding.

**Build takes ~5-10 minutes** — bundles iOS + Android + copies assets.

**Background jobs**: Do NOT run build with `&` in bash tool — the subshell exits and kills the process. Run synchronously.

**API Server**: Runs with `dev` command (builds then runs from dist). Must be restarted after any route/schema changes. The `dev` script rebuilds dist on each start.

**DB schema push**: `pnpm --filter @workspace/db run push` — run after any schema changes. Non-destructive (only adds new tables/columns).
