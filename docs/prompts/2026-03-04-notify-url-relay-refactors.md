# Notify URL Relay Refactor Follow-ups (2026-03-04)

Tracking refactors requested after council ideas. Items are completed in order and checked off as they land.

- [x] 1. Consolidate repeated integration test harness helpers into shared test utilities.
- [x] 2. Unify CLI option definition/validation/help generation with one declarative schema.
- [x] 3. Replace cross-package source import in real E2E with workspace package import, fixing Vitest resolution the right way.
- [x] 4. Remove redundant null guard in `observeTiming`.
- [x] 5. Simplify timeout signal plumbing using Node native Abort APIs while preserving timeout error semantics.
- [x] 6. Deduplicate repeated E2E workflow environment variables at job-level.

## Council Refactor Run #2 (2026-03-04)

- [x] 1. Stabilize and DRY test harness setup; remove `getFreePort()` TOCTOU race by binding proxy to port `0`.
- [x] 2. Deduplicate `observeTiming` emission path to a single payload construction.
- [x] 3. Use named export for the relay class (align with repo style guidance).
- [x] 4. Replace avoidable `as` casts with stronger typing/narrowing where practical.
