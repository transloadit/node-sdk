# Clean generator tests for PR #514

- [x] Inspect checkout ownership, local rules, CONTRIBUTING, the Content sync runbook, export7
  evidence, PR feedback and recent main. Entry: `4602f3f939890d4e1324cccecd988233d7be4bed`;
  main: `88ff755ebcd0ae9adf2992489fc40a287d5090eb`, already an ancestor. No review threads.
- [x] Reproduce Node 24 job `107675570823` from run `36012228183` with Types/Zod generated
  directories absent. Node v24.21.0: the isolated fixture passes; recursive JSON test fails with
  `ENOENT` for `src/generated/robots/ai-chat.ts`.
- [x] Generate recursive JSON test inputs from SDK sources in an isolated temporary root. Keep all
  seven semantic assertions, the existing composed-type regression and cleanup.
- [x] Verify clean Types/Zod generator tests and sweep added generator tests for stale outputs.
  Types passes both regressions without creating repository output. Zod passes both generator
  regressions and all six runtime tests: its existing `test:unit` script runs both generators
  before tests that consume real generated output; its isolated regression generates its own
  fixtures. No additional stale-output defect was found.
- [x] Resolve council P2: copied sources resolved root Zod 4.4.3 instead of the SDK’s Zod 3.25.76.
  The new matching-resolution assertion fails before linking SDK dependencies and passes afterward.
  Both Types regressions pass with repository-generated output still absent.
- [x] Repeat scoped council review after preserving SDK dependency resolution: no issues found.
- [x] Run full repository checks and relevant consumer type checks under Node v24.21.0: `yarn check`
  passes 1,416 tests with one existing skip; `test:types`, `lint:publish`, `knip` and
  `lint:transloadit-sync` pass. Final clean Types/Zod suites pass with all three generated
  directories absent, then restore the exact preserved directories.
- [x] Verify exact test/documentation scope, unchanged approved changeset and retained artifacts.
  Export7 and docsfinal tarball hashes match; retained export7 fingerprint parity passes with an
  explicit extracted baseline. Production source, manifests, dependencies and release levels are
  unchanged, so existing packed-runtime evidence remains applicable.

Commit and final CI evidence will be recorded in the PR and `.cache/alphalib-260924-sdk-ci-final.md`.

PR: https://github.com/transloadit/node-sdk/pull/514
