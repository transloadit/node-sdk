# Numeric XPKeywords follow-up for PR #514

- [x] Confirm clean SDK ownership on `alphalib-260924` at
  `bd115e8f583160905ee1375a50fd6de16d6702f0`; read rules, CONTRIBUTING, final CI and export7 receipts.
  No open review threads. All sixteen retained docsfinal/export7 tarballs pass their recorded hashes.
- [x] Read immutable API2 commit `495dd4a521be849f1ced32fe86a5aaae82c681ab` without modifying its
  checkout. Reuse the excluded SDK adapter’s existing string/finite-number `metadataTextSchema`.
- [x] Reproduce numeric XPKeywords rejection before the fix in SDK parsing, the mocked SDK client
  and both generated Zod versions. Preserve null, undefined, omission and strings; reject nonfinite
  numbers, objects, arrays, booleans and bigint independently in uploads and results.
- [x] Apply the single-field widening and pass the focused SDK and generated Zod regressions.
  Add explicit generated Types/Zod input/output type assertions. Preserve all existing tests.
- [x] Repack all eight packages and compare every one of 3,099 members against freshly extracted
  local export7 tarballs. Exactly 14 files change: Node 4, legacy 4, Types 2 and Zod 4. Reversing
  only XPKeywords restores every source/runtime/declaration byte except equivalent Zod v4
  property ordering, verified by AST. Three maps change only position mappings. No file, mode,
  manifest or dependency changes; MCP, Utils, Viewer and notify relay tarballs are byte-identical.
- [x] Pass packed Node 20.10 XPKeywords checks on Node, legacy and both Zod versions, along with
  all previous smoke, metadata, model and ImageEnhance probes. Browser bundles preserve every
  module/import edge from export7, use only Zod dependencies and pass without Node globals.
  Pinned Edge passes: Node 26,011,286 raw / 2,477,405 upload bytes; legacy 26,011,079 / 2,482,773;
  no native dependencies, unchanged 32 MiB raw / 5 MiB upload limits.
- [x] Complete scoped council review: no issues found. Node v24.21.0 / Yarn 4.12.0 `yarn check`
  passes 1,435 tests with one existing skip. Consumer types, publish lint, Knip and wrapper sync
  pass. Fresh generated fingerprint equals the reviewed artifact and candidate; parity passes
  with explicit local baseline/current extraction paths, without automatic worktree fallback.
- [x] Reverify all sixteen retained tarballs and the eight new tarballs. Manifests, lockfile,
  workflows, check scripts, companion fingerprint and approved four majors / MCP minor are
  unchanged. Preserve the excluded SDK adapter and the complete 369-code runtime inventory.

Evidence is retained under `test-results/alphalib-260924/xp-*`, including complete member diffs,
artifact hashes and before/after failures. Ignored `.cache/alphalib-260924-sdk-xp-ready.md` and
`.cache/alphalib-260924-sdk-xp-final.md` receipts record commit/push and final CI. No API2 publication
catalog, separate release, merge, global sync, extra checkout or credentialed provider action is
in scope. CI results are also recorded on the existing PR.

https://github.com/transloadit/node-sdk/pull/514
