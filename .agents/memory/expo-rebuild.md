---
name: Expo rebuild process
description: How to build and serve the Expo web app in the Replit environment.
---

## Web build (for browser preview)
```
pnpm --filter @workspace/doorstep-app run build:web
```
- Runs `expo export --platform web --output-dir dist`
- EXPO_PUBLIC_DOMAIN is auto-read from `REPLIT_DEV_DOMAIN` or `REPLIT_INTERNAL_APP_DOMAIN` in `scripts/build.js`
- Output goes to `artifacts/doorstepApp/dist/`
- Must be re-run after any app code changes to update the browser preview

## Serve
```
PORT=5000 pnpm --filter @workspace/doorstep-app run serve
```
- `server/serve.js` serves `dist/` as SPA (all unmatched routes → `dist/index.html`)
- Proxies `/api/*` to API server on port 3000
- Also serves Expo Go manifests from `static-build/{ios,android}/manifest.json` when `expo-platform` header is present

## Mobile (Expo Go) build
```
pnpm --filter @workspace/doorstep-app run build
```
- Runs `scripts/build.js` which starts Metro, downloads iOS + Android bundles
- Output in `static-build/{timestamp}/` plus `static-build/ios/manifest.json` and `static-build/android/manifest.json`
- Takes several minutes; run synchronously (not with &)

## Package name
`@workspace/doorstep-app` at `artifacts/doorstepApp/` (NOT `kinetic-shoes`)

**Why EXPO_PUBLIC_DOMAIN matters**: Baked into the Metro bundle for native API URLs. On web, `getApiBase()` falls back to `window.location.origin` so the proxy works without it.
