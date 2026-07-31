---
created: 2026-07-31T03:30:00.000Z
title: "ReferenceError: location is not defined during static generation"
area: build
files:
  - planechaser/src/lib/audio/audio-manager.ts
  - planechaser/src/lib/supabase/client.ts
---

## Problem

`npm run build` prints this during the static-generation phase:

```
ReferenceError: location is not defined
    at <unknown> (.next/server/chunks/ssr/_0dyq892._.js:7:1030)
```

The build still exits 0 and all 32 routes generate, so it is currently
cosmetic — but it means some module touches `location` at import time in a
server context. That is exactly the kind of thing that turns into a hard build
failure on a Next minor bump, and it makes real build errors easier to miss in
the log.

**Confirmed pre-existing**, not introduced by the 2026-07-31 hardening PR —
verified by stashing that PR's changes and rebuilding from the base commit,
which reproduces the same single occurrence.

## Solution

1. Identify the module: build with source maps or bisect by adding
   `if (typeof location === 'undefined') console.trace()` guards. The likely
   candidates are `audio-manager.ts` (module-scope singleton) and the Supabase
   browser client, both of which are imported from client components that get
   prerendered.
2. Move the `location` access behind a lazy getter or a `typeof window`
   guard so it only runs in the browser.
3. Consider failing the build on unexpected stderr in CI once it is clean.
