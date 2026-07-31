---
created: 2026-07-31T03:30:00.000Z
title: Clean up react-hooks/set-state-in-effect violations (21 sites)
area: frontend
files:
  - planechaser/eslint.config.mjs
  - planechaser/src/store/app-store.ts
---

## Problem

React 19's `react-hooks/set-state-in-effect` rule flags 21 call sites as
errors. As of the 2026-07-31 hardening PR the rule is downgraded to `warn` in
`eslint.config.mjs` so CI can gate on genuine errors — this todo tracks paying
the debt down.

The dominant pattern is the hydration guard:

```ts
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])   // app-store.ts:55
  return hydrated
}
```

Others are `setState` calls in effects that mirror props/store values into
local state, which cause an extra render pass on every change.

Affected files (from `npm run lint`): `src/store/app-store.ts`,
`src/components/navigation-loader.tsx`, `src/app/game/page.tsx`,
`src/app/setup/page.tsx`, `src/app/lobby/page.tsx`, `src/app/decks/[id]/page.tsx`,
`src/app/custom-planes/new/page.tsx`, `src/app/custom-planes/[id]/edit/page.tsx`,
`src/app/admin/page.tsx`, `src/app/friends/page.tsx`, `src/app/profile/page.tsx`,
`src/app/scheme-decks/[id]/page.tsx`.

## Solution

Not a mechanical find-and-replace — each site needs its own read:

1. **Hydration guards** → replace `useHydrated` with `useSyncExternalStore`
   (`() => true` client snapshot, `() => false` server snapshot), which is the
   sanctioned React 19 pattern and removes the extra render.
2. **Prop/store mirroring** → derive during render instead of storing, or use
   the `key` prop to reset a component when the source changes.
3. **Genuinely effectful cases** (audio init, subscriptions) → these are
   legitimate; add a targeted `eslint-disable-next-line` with a one-line
   reason rather than leaving them to the blanket downgrade.

Once the count reaches zero, restore the rule to `error` by deleting the
override block in `eslint.config.mjs`.
