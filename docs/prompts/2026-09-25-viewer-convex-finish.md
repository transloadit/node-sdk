# Finish the Viewer / Convex DX cleanup

Kevin approved implementation on September 25, including the coordinated Changesets release.
SDK work belongs in `node-sdk-clone-1` / `viewer-react` / [#518](https://github.com/transloadit/node-sdk/pull/518).
The existing Convex owner handles `framework1:~/code/convex` / `dam-private` / [#33](https://github.com/transloadit/convex/pull/33).
Do not touch the other SDK checkout, Content's unrelated environment changes, or API2 deployments.

## Agreed scope and checks

- [x] Inspect PR comments, branch ownership and CI. No SDK review comments outstanding;
  all runnable checks passed at `7e12720`. Merge latest `origin/main`: already up to date.
- [x] Share the existing bounded ThumbHash decoder between Next and React, red-first.
  React accepts `placeholder="blur"` and optional receipt metadata. Default remains empty;
  transparent and letterboxed images stay safe. No native decoder, load handler or new dependency.
  This supersedes the review's proposal to remove unused ThumbHash extraction from the demo.
- [x] Preserve Next's request-authorized private no-inline-pixels protection. In React, the
  application's data query must authorize preview pixels before returning the ThumbHash.
- [x] Correct published-alpha wording, add a static-catalog vs dynamic-receipt chooser and
  document both extraction cost and browser/SSR rendering boundaries honestly.
- [ ] Convex: keep Load more on filtered empty pages, document real retained tombstone data,
  run official component codegen with a drift guard, and dogfood the opt-in placeholder.
- [ ] Convex: try the bounded `convex-helpers` paginator + React hook substitution. Preserve
  stable live ranges, ties, read limits, split pages, old-cursor reset, errors and authorization.
  Keep the expiry scan's continuation. Defer if integration needs more workaround layers.
- [ ] Run focused regression tests, package/type/bundle checks, packed browser fixtures,
  evidence-bound Claude user/security review and council review; fix verified findings.
- [ ] Push and verify exact-head CI. Publish SDK packages through Changesets, keeping Viewer
  alpha. Then use exact registry versions in Convex and delete temporary tarballs/QA overrides.
  Preserve the release guard and Yarn age gate (exact-version exceptions only if necessary).

## Boundaries

No production deployment, new Storage canary, new credentials, or environment-file changes.
The one previously authorized synthetic asset was already cleaned up. Existing QA/local fixtures
are sufficient for regression work; obtain explicit direction if a new external mutation is needed.
API2's Community filtered-original watermark remains the separate deferred
[#9253](https://github.com/transloadit/api2/issues/9253). Uppy stays with its team.

## Evidence

The prior converged review and stopwatch reports are in `/tmp/viewer-dx-20260925.jB8OYY/`.
Those timings describe the previous head, not this follow-up. Record new check receipts here
before claiming completion. Published Viewer 0.0.2 does not yet include `/react` or `/server`.

Follow-up evidence: nine new tests failed before implementation; all 455 Viewer tests pass after
it. The packed Next fixture passes 68 browser checks with Cache Components, 68 without, and ten
development checks (Chromium + WebKit, no retries or skips). This includes delayed React blur,
alpha/letterboxing/crop delivery, and the application withholding hashes before query authorization.
The fake CDN serves real synthetic image bytes; this is not a new production API2 canary.
Logs: `/tmp/viewer-finish-fixture-20260925.log`; JSON/screenshots in `test-results/img-next/`.

Measured complete React entry: 17,880 bytes minified / 6,443 Brotli excluding React, up from
15,302 / 5,182 (delta 2,578 / 1,261). Web handler remains 14,495 / 4,833, with no decoder in its
graph. No dependency added. Browser checks remain bounded by the existing packaging budgets.

`yarn check`, `verify:full`, and every runnable GitHub check passed for `3631c94`
([run 36155140388](https://github.com/transloadit/node-sdk/actions/runs/36155140388)).
The council then found two issues: stretched crop placeholders and failed Assemblies with
`ok: null` losing their failure code in the pure extractor. Both were reproduced red-first;
cover background sizing and nullable status parsing fix them. Focused tests now pass (456 Viewer
tests and both Zod versions). The packed fixture is rerunning after these narrow fixes.

Claude's evidence-bound UX/security review found no authorization regression. Its CSS-class fit
concern is the documented SSR limitation: mirror a stylesheet's `object-fit` in `objectFit`.
The real consumer does so, and the renderer now comments this contract. The client-decoder doc
concern was stale preview-pack wording, already corrected on `3631c94`. Native broken-image UI
can retain the blur without `errorFallback`; the React guide now states that tradeoff explicitly.
The fixture's alpha receipt MIME was also corrected. No new load handler is warranted.

Lead desktop/mobile deterministic and exploratory evidence is in
`/tmp/viewer-finish-browser.RqA8N5/evidence/` (three checks, zero console errors or failed requests).
The reviewer inspected the installed preview pack because its read sandbox excluded the SDK
checkout; the lead owns the packed Chromium/WebKit result verification. The named browser and
owned servers were stopped. These remain local synthetic proofs, not a fresh production canary.
