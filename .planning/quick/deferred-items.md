# Deferred Items

## From quick task 260701-d85 (fix low-contrast border color + auth gradient)

| File | Issue | Status |
|------|-------|--------|
| `planechaser/tests/multiplayer-session.spec.ts` (lines 14, 55) | Pre-existing TS2739 errors: test fixture object literals missing `secondPlaneIndex` and `eliminatedPlayerIds` from `GameState` type. Unrelated to this task's scope (globals.css border tokens, auth page h1 className). Last touched in commit `250a547`, well before this task's base commit. | Deferred — out of scope, not fixed |
