# Storage image onboarding review

## Live Storage S3 follow-up

Source: `/tmp/img-storage-ls-devdock.md`. Continue after the six council fixes in #500;
no merge, publication, production access, or API2 implementation changes. Latest main is
already an ancestor, and GitHub has no review threads. Only the owned clone17 devdock may
enable `API2_STORAGE_S3_ENABLED=true` through its `env.sh` custom overrides.

- [x] Reproduce the disabled-controller failure before enabling and restarting locally.
- [x] List `website/`, including the stranger-test original, through the real signed endpoint.
- [x] Prove the credential-bound endpoint and explicit override against that endpoint.
- [x] Check real HEAD metadata for dimensions and the complete receipt recovery contract.
      Implement sync red-first only if that public surface provides the required metadata;
      otherwise retain the committed receipt recommendation and report the API2 boundary.
- [x] Record evidence and run sequential checks/fixture; track exact-head CI in #500.
- [x] Stop owned services and remove temporary credential copies after verification.

Live probe at 2026-09-12T21:35:26.051Z passes: six existing images, saved credential endpoint,
explicit override with an untouched decoy, unmatched-prefix result and cross-workspace/unsigned denial.
The backing object has 1024×683 metadata; public HEAD omits it and the asset ID. Per the brief,
do not patch API2 or add partial sync. README keeps `commit images.json` and names the exact gap.
The only fixture correction beyond the feature flag is using an existing ordinary read-scoped
key instead of the Assembly-only internal admin shortcut. No key permissions or SDK runtime
changed. Full details: `docs/img-dogfood.md` and `/tmp/img-storage-ls-result.md`.
Sequential root check/full verify and the packed fixture pass: eight seed cases and 60
first-attempt Chromium/WebKit cases, no retries, skips, flakes or native-response errors.
The follow-up changes documentation only; the prior runtime council findings remain resolved.
Exact-head CI is recorded in the PR checks and the local result/handover, not inferred from
the earlier commit's green status. Owned services are stopped and temporary credentials removed.

## Final round-4 council — active follow-up

Source: `/tmp/img-pr500-r4-council.md`, reviewed against `888c4e0`. Work continues in #500;
no merge or publication. Main is still an ancestor of `8e5d7fc`; no GitHub review threads.

- [x] Root-path store output must not implicitly allow the whole workspace.
- [x] Storage listing must keep endpoint and signing credentials from one resolved source.
- [x] Hidden receipts imports must use an explicit relative module prefix.
- [x] Compact error-boundary identity without losing candidate/placeholder reset behavior.
- [x] One shared directory-prefix validator for the CLI and renderer.
- [x] Development HEAD probes must not block direct or redirect delivery.
- [x] Cold legacy Knip regression fixed in `8e5d7fc`; both Verify jobs are green.
- [x] Sequential checks and packed fixture.
- [x] Push and exact-head green CI.
- [x] Then a fresh Opus stranger test from a stock consumer against the owned devdock.

Seven assertions failed first across the six findings, then 54 focused CLI and 161 renderer
cases passed. Root objects still store successfully, but print no factory and explain the explicit
scope decision. Listing resolves configuration once and retains only the explicit endpoint override.
The unchanged path validator moves into utils for both actual consumers; the separate permissive
Storage Grant prefix normalizer retains its different contract. The changeset releases utils with
the SDK, and Changesets updates its dependent ranges. A browser-safe 64-bit FNV-1a remount key keeps
candidate/placeholder reset semantics without another dependency; it is not an authorization hash.
HEAD probes remain deduplicated and error-contained, but neither rendering nor redirects await them.
The post-fix council found one command-specific message mismatch: the shared validator permits an
explicit empty prefix, but image init must not suggest that option. Ten invalid-prefix cases failed
on the message first, then all 26 onboarding cases passed with an actionable directory example.
Validation remains shared; only the CLI error presentation differs.
Final local root check/full verify pass: Node 374 cases (one existing skip), img 203 and utils 54,
plus the other workspace/type/Knip checks. All eight packed seed cases and 60 browser cases pass
on their first attempt across both Cache Components configurations. The machine-readable native
response audit reports no errors, retries, skipped cases or flakes. Existing tooling warnings
(unused Storage Grant test variable, coverage-version mismatch and socket listener counts) remain
outside this scoped correction.

Implementation head `3cc783ab06174d5facd4f3bf3525d81e56d7aea1` is green in CI run 34717820219:
ten checks passed. Its downloaded browser artifact independently confirms all 60 first-attempt
passes and the clean native-response audit. No merge or publication.

The new stock `src/app` stranger trial initially missed its time gate at 10m27 because this
operator's restarted devdock lost both its local R2 process settings and its temporary-file
loopback hostname. Restore those fixture prerequisites, not SDK code. The exact reader recipe
then rendered successfully. That interrupted attempt remains a failure of the clean timing gate.

A different fresh read-only Opus reader then used another stock Next 16.3.4 app and the same packed
SDK code: 21:00:36–21:03:33.624 UTC, **2m58**, including reading, operator execution, actual private
pixels and positive/negative browser checks. Four reader-authored files; no TypeScript changes or
manual manifest edits. CLI login/store, a 25,469-byte 960×640 AVIF, authorized HEAD 307/private-no-store,
anonymous GET 404/private-no-store and app/CDN cookie isolation all pass with zero browser errors.
This is agent-assisted integration time after infrastructure/install preparation, not a human
reading-time claim or production-CDN latency benchmark. Evidence and remaining nonblocking README
questions are recorded in `/tmp/img-stranger-test.md` and `/tmp/img-task2-handover.md`.
Independent Opus evidence review passes UX and defensive security, with no blocking findings.
Its low-priority evidence suggestions (record measured boxes/name and the AVIF container brand)
are included in the production repeat. The stock consumer also builds successfully: the page is
static, only the private image handler is dynamic, and tsconfig remains byte-identical.

## Round 4 — active merge gate

Source: `/tmp/img-task2-round4-brief.md` and `/tmp/img-round4-inputs.md`. All work stays in
#500 on `img-onboard`; no merge or publication. Round-3 head `1e9f575` is green, not the
round-4 merge gate. Required checks/builds/packs run sequentially before every push.

- [x] Correct the production Bunny cache contract; default rotation to the expiry interval.
- [x] First-pixel CLI/login/init, complete snippets, README order, fail-fast prefixes, no Image alias.
- [x] Explicit public-prefix caching, named private factory, dynamic warning, bounded template migration.
- [x] Recoverable SDK receipts, CLI list and explicit overwrite; catalog sync only when API2 supports it.
- [x] Per-breakpoint crop geometry, lazy constrained sizes, receipt presentation dimensions.
- [x] Safe route diagnostics and inferred Next basePath.
- [x] Sequential checks, packed browser proof, security review and green CI.
- [x] Fresh Opus stranger test against the owned devdock; `/tmp/img-stranger-test.md`.

Correction: production `*.tlcdn.com` uses Bunny and includes the whole query string in its cache
key. The round-3 CloudFront/NoCacheSigExp production claim below is superseded. Changing expiry
or signature makes a new CDN cache entry. Shared Docker/production infrastructure stays outside
this task. Receipt catalog dimensions are API2-owned; keep schemas canonical. `storage receipts
sync` is deferred: the new catalog dimensions are not yet exposed together with asset ID and MD5
by the public S3 listing. `doctor` is deferred; the package now supplies scoped development hints.

Migration acceptance uses an explicit absolute UTC cutoff, `previousTemplatesUntil`, so restarting
a process never extends the grace period. Within that window the prior Built-in version defaults
to 0.0.1; `previousTemplates: []` disables acceptance immediately at the handler. Already-issued
and cached grants retain their own bounded lifetimes. Default rotation equals the one-hour minimum
grant lifetime, giving stable URLs within a bucket and one-to-two hours of remaining validity.

The first final check cycle passed Node353/img196 cases plus public types, root check/full verify,
eight packed seed cases and 60 first-attempt browser cases. Every case has an error-free native
response audit. Real art-direction bytes match the mobile/desktop crops; preload links must remain
outside picture or Chromium starts a speculative JPEG. Cache Components enabled/omitted pass.

The required council found six valid items: retain verified receipts after save failures, preserve
catalog mode, reset errorFallback on candidate changes, distinguish cancellation, avoid false HEAD
redirect warnings, and explain fill's receipt requirement. The fresh read-only Opus reader found an
additional real login failure with API2's punctuation-bearing fixture secret. Twelve regressions
failed first, then all 254 focused cases passed. Docs also clarify app-root paths, Web Request,
404 denial, private-factory overrides and CLI endpoint naming.

The stock Next16.3.0 consumer's pre-existing critical advisories triggered a test dependency update
to16.3.4 (the patched release allowed by the repository's two-day dependency age gate). The separate
scratch app uses16.3.5, installed normally; npm audit there reports zero vulnerabilities. No age-gate
bypass or manual consumer package/tsconfig change. Final checks are repeated after these changes.

Owned API2clone17 is now5235a3605f on its existing internal-only Docker network, with no route to
external services. Workspace-specific offline caches restored guest dependencies without weakening
that isolation. The ordinary system canary passes. After applying only the canonical local
dimensions migration, the actual packed storeImage plus getStoredImageReceipt flow passes:
Assembly0b15a6e51c904d61896bbdc7601b2702, receipt1024×683/92,230B, identical recovered metadata.
This technical check is distinct from the still-pending stranger browser trial and production CDN.

Post-review verification now passes Node 365 cases (one existing skip), img 200 cases/public
types, eight seed cases and all 60 packed Chromium/WebKit cases on patched Next 16.3.4. The new
production build exposed an existing fallback assumption: Flight can outline the picture as a
lazy React reference. Normalize it with React's Children API before cloning; candidate changes
still reset fallback state, without a new wrapper or dependency. Both cache configurations pass.

Opus confirmed the public/private cache, migration, receipt and diagnostic boundaries. Its valid
login finding now has a shell-only write destination and refuses app env filenames before asking
for credentials. Public-prefix errors name the correct setting, and temp-cleanup failures no
longer strand the receipts lock. Five new regressions failed first, then all 160 focused cases
passed. Existing documented project-env endpoint trust is unchanged; no new trust is inferred.

The first fresh-reader attempt found the real opaque-secret login bug; its corrected live run
took 6m31 and rendered a 25,469-byte AVIF with no browser errors or cookie leakage. Anonymous
access returned 404; authorized HEAD returned 307 with no body, both private/no-store. A second
fresh reader and stock consumer are being tested after the fixes, not reusing that reader's
knowledge. The new cold-reader run passed in 3m05 (19:35:13–19:38:17 UTC), with the same real
private pixels, anonymous denial and cookie isolation. The four reader-authored files were applied
verbatim in a stock Next 16.3.4 app; npm was the only manifest editor and tsconfig stayed identical.
The read-only-reader/operator protocol, initial failure, ten required concepts and remaining
reading friction are explicit in /tmp/img-stranger-test.md; this is not a human usability timing.

The final source-change sweep covers the standalone renderer's media-placeholder source too
(red-first), bringing img to 201 passing cases. Defensive post-fix review passes; its one stale
partial-snapshot finding was cleared against the complete current source copy. Documentation now
states the default private route, npm invocation, literal capability/grant distinction and the
optional standalone seed path. No security boundary was relaxed to obtain the onboarding pass.

Use the repo-pinned Biome for workspace checks. Without the root node_modules/.bin on PATH,
the Node workspace can pick up the host's newer global Biome and report unrelated fixture SVG
rules/formatting. Those accidental formatting edits were removed; no fixture lint was suppressed.

Final sequential local checks pass: img 201/public types, legacy generation/parity, root check,
full verification, eight seed cases and 60 native browser cases (56.6s/57.3s). Every browser case
has exactly one passing attempt and an error-free native-response audit, with no skips/flakes.
The final packed image package was installed normally into the stranger consumer and independently
rechecked against the real devdock at 19:48:45 UTC: the same pixels, cookie boundary and 307/404
results pass. The original timed result is preserved separately as result-timed.json.

The first round-4 push (`888c4e0`) passed unit/build/release/e2e/browser CI but failed both verify
jobs: cold checkouts have the legacy package manifest without its generated sources. The new S3
dependency must join that workspace's existing generated-source exceptions; the canonical Node
package remains checked normally. A failing-first manifest/config regression now runs in root CI.
An extra read-only devdock listing probe returned 403 because its separate Storage S3 API is
disabled before authentication. The README and sanitized CLI hint now name that prerequisite;
no API2 flags, credentials or running services were changed to turn on listing.

## Final round-3 council

Source: `/tmp/img-pr500-r3-council.md`, against #500 head `0ce8c14`. Five bounded fixes remain
in this PR, red-first, followed by sequential checks/fixture and green CI. The supplied council
is the review input; no new delegates, merge or publication. Kevin reviews the result next.

- [x] CLI receipt-validation failures name the destination/Assembly ID and warn about conflicts.
- [x] Receipts-file failures preserve filesystem reasons and name the path, separately from JSON errors.
- [x] Fixed-layout string sources explain that a receipt is required before geometry is dropped.
- [x] Subpixel source crops explain the source/aspect-ratio constraint before candidate signing.
- [x] Remove the obsolete import-extension prerequisite from the maintainer walkthrough.
- [x] Sequential affected checks, root/full verification and packed fixture.
- [ ] Push and green CI; record the post-push outcome in the PR body and handover.

Twelve assertions failed first across all five findings; all 165 focused cases now pass. The
malformed-receipt case calls the real storeImage validation through the CLI and checks receipt/lock
preservation. Permission denial is injected portably, and symlink/directory/JSON failures use real
temporary files. Ordinary upload errors keep their original output. Fixed-layout checks still
snapshot src once; the one-pixel crop boundary remains valid, while subpixel crops fail before
signing with both default and explicit candidate widths. Public img types pass. Logs:
`/tmp/img-r3-council-{red,green,img-types}.log`. No schema or Template contract changed.

Final sequential checks passed: Node 328 cases (one existing skip), generated legacy parity,
img 178 cases plus public types, root `yarn check`, `yarn verify:full`, then the packed fixture.
All eight seed cases and 48 Chromium/WebKit cases passed (24 per Cache Components configuration,
55.9s/53.3s), with no retries/skips/flakes and a native-response audit in each case. Logs:
`/tmp/img-r3-council-{node-check,legacy,img-check,check,verify,fixture}.log`. The Node check's
unrelated generated intent-document drift was removed byte-for-byte before wrapper verification.
After the push/CI gate, the supplied final council has no remaining items and Kevin reviews next.

## Server-side round-3 follow-up

Source: `/tmp/img-server-side-round3.md`, API2 #9057 head
`a15af5ed96a4605cd500587cf002bd249534fe62`. Earlier round-3 implementation is pushed and green
at `a760ae8` (CI34700979700). This follow-up stays in #500, without merge/publication.

- [x] Pin storage-preview@0.0.2; sign transparent modern candidates and opaque configurable JPEG.
- [x] Bind background through redirect capabilities and disallow global bg overrides.
- [x] Sync only the canonical import schema byte-identically; new blob
      `2a4d398ae1caef1b4ee9e0efa66be81a6d204896`, including `recursive`.
- [x] Document CloudFront NoCacheSigExp and the server-enforced two-key purposes.
- [x] Verify transparent/opaque pixels in the packed browser fixture.
- [x] Attempt the owned API2 canary; record the guest DNS blocker without a false server pass.
- [x] Sequential checks, generated packages and final packed fixture.
- [x] Push and green CI (head `0ce8c14`, CI34703027822; evidence in the PR body and handover).

Thirteen focused regressions failed first; all 145 focused runtime cases then passed. The
canonical schema removes the recursive schema violation. Its existing no-storage advisory for
the Storage Robot is unchanged; it is not a recursive error and is outside this schema sync.
The package adds `fallbackBackground`, accepts only opaque RGB/RGBA hex and retains server policy
over caller URL parameters. No Node SDK or API2 secret is exposed in diagnostics/markup.

The canary fast-forwarded cleanly to the API2 head, preserving its pre-existing Deno lock/test
files. It restarted without bootstrap or published ports. Guest package installation failed
fetching packages with ERR_SOCKET_CLOSED_BEFORE_CONNECTION, including a bounded IPv4 retry.
The guest's registry DNS lookup also failed (`getent` exit 2; resolver 127.0.0.11). No system test ran. The
container is stopped again, and only the pre-existing Deno lock/untracked canary remain dirty;
automatic Yarn lock deduplication was undone. API2's supplied pixel proof is separate evidence,
not a new successful canary run by this agent.

The first packed browser attempts hit a fixture navigation bug (`/transparency` omitted its
`/fixture` base path), not an alpha regression. Corrected that path and added a heading assertion;
do not count those failures as pixel-level red-first evidence. The thirteen model/route/schema
failures and the README regression are the actual red-first proofs for this follow-up.

Final checks pass sequentially: Node 324 cases (one existing skip), img 174 cases and public
types, canonical types/Zod generation/checks, legacy parity, root `yarn check`, `yarn verify:full`
and the final packed fixture. All eight seed cases and 48 browser cases pass (24 each, 54.6s/53.6s),
without retries, flakes or skips. Every browser case has a native-response audit. Both browsers
decode 64×64 AVIF/WebP/PNG corners as `[0,0,0,0]` and the JPEG corner as `[34,68,103,255]` for
the requested `#224466` (one lossy blue-channel unit). The measured HTML table below is refreshed
for 0.0.2/background-bound capabilities. Logs: `/tmp/img-alpha-final-{node,legacy,img,types,zod,
check,verify,fixture}.log`. API2 live verification remains blocked as described above.

## Round 3

Kevin's `/tmp/img-task2-round3-brief.md` requests all work in #500, red-first, without merging
or publishing. Council remains orchestrator-owned. Checks, builds and packs run sequentially.

- [x] Safe seed receipt replacement; bounded JPEG fallback; required prefix configuration.
- [x] StorageImage factory export and ordinary Next.js consumer imports/install instructions.
- [x] Accurate lazy-loading wording, opt-in bounded private redirect caching and HTML benchmark.
- [x] A: CLI `storage store` with atomic keyed receipts and existing credential resolution.
- [x] B: Constrained/fixed/fill layout derivation, signed fillcrop, native browser proofs.
- [x] C: Development-only, deduplicated diagnostics and optional image error fallback.
- [x] D: User-upload ingest, notification and receipt persistence documentation.
- [x] E: Authorized redirects first; direct delivery cost/lifetime optimization explained.
- [x] Sequential affected package checks, root check, full verification and packed browser fixture.
- [x] Push, monitor #500, record evidence and remaining release gates (head `a760ae8`, CI34700979700).

API2's import schema must stay byte-identical; server-side platform changes remain with Kevin.

A: `storage store` reproduced nine failing CLI cases before implementation. Its ten focused tests
now pass; Node package check passes 322 tests with one existing skip. Reuses AuthenticatedCommand
and storeImage; sibling lock prevents lost updates and rename preserves receipts on failures.
No schema changes. Generated legacy parity and the packed CLI help are in final verification.
An additional red-first regression preserves existing JSON keys such as `__proto__` during append;
the focused CLI suite now has eleven passing cases.

B: Layout runtime and public type regressions failed first, then passed. The browser fixture also
failed first on the legacy CSS-only cover recipe (ten failures). Constrained heroes cap the derived
ladder at 1920px; fixed 48px avatars request real square fillcrop bytes with a 48px JPEG fallback;
portrait fill uses the box ratio, not oversized landscape downloads. Explicit overrides remain.
Lazy default sizes now use `auto, 100vw`; eager/preloaded usage keeps its existing contract.

C: Six diagnostic cases and two browser-error fallback cases failed before implementation. Probes
are development-only, one HEAD per path/Template/factory, after redirect authorization, with a
five-second timeout and static, credential-free hints. A generic 403 cannot establish one exact
cause. A separate slow-probe regression ensures probing cannot consume a new CDN grant's lifetime.
The opt-in client boundary preserves the SSR picture and catches failure before/after hydration;
a mutation test verifies that a changed source resets the fallback. No retries or added DOM wrapper.
The img package passes 162 runtime tests and its public type fixtures.

D/E: The consumer walkthrough now starts with request-authorized redirects and the CLI receipt
file. Uppy/Assembly uploads use server-owned paths and `/transloadit/store`; trusted server polling,
upload correlation, exact receipt validation, EXIF display dimensions and persisted ownership are
explicit. A doc regression failed before the rewrite. Direct delivery is a named optimization with
its expiry/cache trade-offs. The Robot recipe was checked against the local offline catalog.

The packed fixture passes eight seed cases and 44 browser cases across both production Cache
Components configurations (22 each in Chromium/WebKit, 53.3s/52.6s), including the native error
fallback. Logs: `/tmp/img-round3-complete-fixture.log`, `/tmp/img-round3-cli-docs-green.log`,
`/tmp/img-round3-fallback-reset-{red,green}.log`, and `/tmp/img-round3-diagnostics-check.log`.
Final verification, including the last CLI key-preservation change, passed sequentially: Node
package check (323 passed, one existing skip), generated legacy wrapper, img package check
(162 passed plus public types), root `yarn check`, `yarn verify:full`, and the packed production
fixture (eight seed tests and 44 browser cases). Logs: `/tmp/img-round3-final-{node,legacy,img,
check,verify,fixture}.log`. Unrelated generated intent-document drift was removed byte-for-byte.

Publication is still gated on an independent stranger reaching a private image in under ten
minutes in a stock create-next-app without TS/module changes. These packed local tests are not
that user test. API2/Console cache-key policy, unified credentials, alpha preservation and metadata
lookup remain Kevin's separate scope; no merge, release or production deployment is authorized.

Part1: nine runtime failures and an unused type-error expectation reproduced first; all 136 img
tests/types now pass. The documented seed command separately reproduced receipt truncation, then
preserved the file. Sequential root check/full verification and the packed fixture pass, including
eight seed tests and 36 Chromium/WebKit cases (both production Cache Components configurations).
The fixture app no longer needs explicit module type or TypeScript import extensions; only its
internal Node tooling uses a separate TS config. Consumer imports have a scoped lint exception.
Logs: `/tmp/img-round3-part1-{check,package,verify,fixture}.log` and
`/tmp/img-round3-{receipt-red,receipt-green,part1-red,part1-types-red}.log`.

Measured full HTML (latest 0.0.2 follow-up, Cache Components omitted, bytes, including Next/RSC overhead):

| Images | Delivery | Raw | Gzip | Brotli | App redirect requests |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Direct | 11,026 | 2,621 | 2,194 | 0 |
| 1 | Redirect | 9,904 | 2,911 | 2,483 | 1 |
| 20 | Direct | 96,865 | 13,535 | 7,173 | 0 |
| 20 | Redirect | 69,980 | 33,117 | 17,226 | 20 |
| 100 | Direct | 461,138 | 54,636 | 25,570 | 0 |
| 100 | Redirect | 319,183 | 153,292 | 77,152 | 100 |

This 400×300 fixture has five URLs per image (two widths × AVIF/WebP plus JPEG), not 21.
Twenty-one ~250-character candidates would alone cost ~5KB raw, but that illustrative estimate
is not the measured page. Compression favors repeated direct URL structure over encrypted
capabilities; fewer raw bytes does not mean fewer wire bytes. Local times are not CDN benchmarks.

## Final round-2 council

The orchestrator supplied `/tmp/img-pr500-final-council.md` against `0f214f8`.
Keep these fixes in #500, with no merge/publication or duplicate council round.
Latest `origin/main` is already an ancestor of this branch.

- [x] Return EXIF-oriented receipt dimensions, covering rotated and unchanged inputs red-first.
- [x] Add the eight Storage error codes without copying the divergent status schema wholesale;
      reproduce strict-response polling and terminal-status failures first.
- [x] Fix the test table's widened `ok` type and verify its diagnostic disappears.
- [x] Explain that module-scoped rendering credentials are needed during `next build` and runtime.
- [x] Keep the import schema byte-identical (`a2fb4693f48ffb5c7f56c62fda065c391b7bc919`);
      document the API2-owned `recursive`/`files_per_page` gap in the PR body.

Run sequential affected-package, root, full and packed-fixture checks before pushing; monitor
the resulting head on #500. The final CI result and head are recorded in the PR body and
`/tmp/img-pr500-final-council-result.md`, with resume context in `/tmp/img-task2-handover.md`.

The focused runtime run failed 18 cases before implementation, then passed 88 cases with one
existing skip. The packed regression also failed first: a real 450×600 EXIF-6 JPEG, with metadata
matching API2's `rotated_8.jpg` fixture, returned width 450 instead of its oriented width 600.
That test also checks the receipt-to-model 320×240 candidate against a real auto-oriented decode.
The unit table covers all eight numeric EXIF orientations and their
[ExifTool labels](https://github.com/exiftool/exiftool/blob/master/lib/Image/ExifTool/Exif.pm), plus
absent/null orientation. The original metadata is not mutated.

The status schema gets only the eight targeted enum entries, confirmed against API2's canonical
status schema and `damStoreErrors.ts`. HTTP polling with `validateResponses: true` now retains
`TRANSLOADIT_STORE_CONFLICT`; `createAssembly({ waitForCompletion: true })` exposes `ApiError.code`.
The old mocked `STORAGE_PATH_CONFLICT` spelling was corrected in the existing preservation test.

The standalone Node test tsconfig had 37 existing diagnostics on the review head, including the
reported table error. After the fix it has 36: only this PR's table diagnostic disappeared, with
no new diagnostics. Do not confuse that broader non-required test config with the passing package
build/typecheck. The affected Node package check passes 312 tests with one existing skip.
Unrelated generated intent-document drift from that package check was removed byte-for-byte.
Logs: `/tmp/img-final-council-{red,green,packed-red,types-red,types-after,node-check}.log`.

Final local verification passed sequentially: generated legacy wrapper, img package (126 tests
plus public types), root `yarn check`, `yarn verify:full`, and the packed production fixture.
All seven offline seed tests pass, including the EXIF JPEG. Both browser configurations passed
18/18 (55.9s enabled, 52.7s omitted); all 36 have response-audit attachments and zero retries,
skips or flaky results. The 36 remaining standalone test-config diagnostics are in eleven files
unchanged by #500. No browser harness, import schema, API2 implementation or credential file changed.
Logs: `/tmp/img-final-council-{legacy,img-check,check,verify,fixture}.log`.

## Why

Finish the complete Storage image DX in one reviewable PR, node-sdk #500 against `main`.
The orchestrator supplied the whole-stack council review; do not duplicate that review.

## Review checklist

- [x] Reject non-string `alt` from JavaScript callers, including the renderer and factory paths.
      Preserve strings, including the empty decorative alternative. Reproduce before fixing.
- [x] Keep the pending Suspense shell free of the resolved image's `id` and ARIA relationships.
      Preserve the real image's attributes and the placeholder's layout. Reproduce before fixing.
- [x] Run package checks, the packed Next fixture, and repository verification; monitor CI.
- [x] Retarget #500 to `main` and describe the whole A–D change, including schema provenance.
      Close #497–#499 as superseded, without merging or publishing anything.
- [x] Dogfood one local Content consumer against the isolated canary devdock using the packed
      README recipe, then run the fresh-reader user test. Record `/tmp/img-dogfood-round1.md`.
- [x] Add the approved native-browser proof in this same PR after dogfood and the user test.
- [x] Monitor the browser-proof commit's GitHub checks; keep README feedback for the next brief.

The two P3 fixes belong at the top of the existing `img-onboard` branch. No rebase or force push
is needed. Transparency, package publication, API2 implementation, and production access remain
outside this slice.

The new focused run reproduced six failures before the fix and passed all 65 tests afterward.
Logs: `/tmp/img-task2-p3-red.log` and `/tmp/img-task2-p3-green.log`. The shared attribute snapshot
now validates `alt`; both rendering paths reuse the validated value. The fallback excludes all
caller ARIA attributes because it is inert and decorative; its own `aria-hidden` remains.

After both fixes, `yarn check`, `yarn verify:full`, img checks (87 tests plus type fixtures), and
the packed production Next fixture passed. The package and fixture checks ran sequentially.

The accepted local Content dogfood and independent user test are recorded in
`/tmp/img-dogfood-round1.md`. Only #500 remains open; the README feedback is awaiting the
orchestrator's round-2 brief and must not be changed in the browser-proof slice.

The first real native-cookie regression returned 404 instead of 307 while the image request
carried its HttpOnly session cookie and no Bearer header (`/tmp/img-task2-e-red.log`). The fixture
now uses that cookie, and the browser suite follows redirects to an owned local origin that
independently validates signatures/expiry and serves real encoded image bytes. The existing
five-minute HTTP fixture policy remains; only the separate lifecycle page uses ten-second grants.

The final local run passed all six Chromium cases in 24.3 seconds, after `yarn check`,
`yarn verify:full`, and the img package's 87 tests plus type fixtures. The packed fixture builds
production Next.js with `cacheComponents`, checks the six offline seed cases, and records the
1/20/100-image delivery diagnostics before running the browser suite.

The browser checks cover native HttpOnly-cookie authorization without Bearer headers, actual
prerendered geometry and responsive candidates at 1200px/390px with application JavaScript held,
subsequent hydration, renewal from the original lazy capability, revocation, expiration, and
tampering. Every successful image response is decoded and checked against its requested dimensions
and MIME type; unexpected requests, console errors, page errors, and HTTP failures fail the suite.
The local CDN independently verifies HMAC signatures and expiry and receives no application cookie.

The saved desktop/mobile screenshots were visually checked. Native candidate-height rounding
can move following text by less than half a CSS pixel (640×427 versus 2400×1600); the geometry
assertion documents that tolerance. LCP, image-ready and navigation timings are diagnostics, not
performance thresholds. CI uploads the JSON report with successful screenshots/response evidence,
plus failure screenshots and traces. This is Chromium with opaque generated fixtures, not proof of
production CDN caching, transparency, other browsers, or improved production latency.

Logs: `/tmp/img-task2-e-{check,verify,img-check,final-fixture}.log`.
Local browser evidence: `test-results/img-next/results.json` (ignored build artifact).

## Round 2

The accepted brief is `/tmp/img-task2-round2-brief.md`; the linked independent Codex triage was
read in full. Keep all work in #500 with no merge, release, production access, API2 changes, or
edits to credential files. Council remains orchestrator-owned. Four follow-up commits:

- [x] Browser proof: production Cache Components enabled and omitted, distinct app/CDN hostnames,
      host-wide HttpOnly cookie exclusion at the CDN, JPEG fallback, and WebKit if inexpensive.
- [x] Sequential first-image walkthrough: close all eleven reader questions and document the
      full-cover `sizes` rule. Match the literal tested seed and repeat the Yarn consumer install.
- [x] SDK `storeImage` plus receipt-as-`src`: stream the checksum, validate the one completed
      receipt, preserve cancellation/progress, ship packed exports and legacy wrapper. Snapshot
      source geometry before suspension without weakening loading or authorization contracts.
- [x] Explicit-policy env factory: read the three rendering variables once, require `storage`,
      retain deny-all/redirect overloads, reject invalid environment without exposing secrets.

Before each push, run affected package checks, `yarn verify:full`, and the packed fixture
sequentially. Keep image layout APIs, CLI Storage commands, default-delivery changes, JPEG fallback
sizing changes, alpha preservation and production deployment outside this round.

Round-2 browser verification passed 36/36 cases: Chromium and WebKit with Cache Components
enabled (55.0s) and omitted (51.5s), no skips/retries. `yarn check`, the img package checks, and
`yarn verify:full` passed before the final packed run. Logs: `/tmp/img-round2-1-*.log`.
Evidence now lives under `test-results/img-next/{enabled,omitted}/results.json`.

The hostname regression failed first: a host-wide cookie reached the old same-host CDN. Next
now uses `127.0.0.1`, the CDN uses `localhost`, and no CDN request receives the session cookie.
Chromium's explicit loopback permission is fixture-origin-only; fulfilled HTML otherwise lacks
network address-space classification. The JPEG test disables modern sources before HTML parsing,
not through failed HTTP responses, and verifies the existing source-width fallback policy.

Fresh cookie-cloned browsing contexts exercise new grant requests: WebKit may reuse an image it
already decoded without HTTP, which is not new authorization and does not recall downloaded bytes.
The original lazy capability stays untouched in the main page. Prerender screenshots use another
context so fake empty bootstrap modules cannot contaminate the real page's WebKit module cache.
The benchmark route uses an ordinary Suspense boundary instead of the Cache-Components-only
`instant` setting. Both direct and private hero/avatar images decode before application JavaScript
is released; the subsequent button interaction verifies hydration in both browsers.

The browser-extension commit `73f8dc2` passed all ten GitHub checks, with three expected skips:
https://github.com/transloadit/node-sdk/actions/runs/34688893602.

The README now orders checkout/pack/install, separated credentials, seed, factory and rendering.
Its sequence regression failed first for `.env.local` seeding and use before factory definition;
all six focused fixture tests pass after the documentation fix. All eleven reader questions,
the full-cover `382vw` sizing lesson and the existing JPEG fallback policy are documented.

A separate clean Yarn 4/node-modules app installed all four tarballs with the literal commands.
An explicit root utils resolution prevents a nested registry copy. The six offline seed cases,
TypeScript compilation of the exact seed/factory/render snippets, and public model execution
passed; the lockfile and both img/node resolutions point to the same local utils artifact.
This is separate evidence from the npm-based production fixture, not a second live Storage write.
Logs: `/tmp/img-round2-2-{red,green,yarn-install,yarn-proof,yarn-types}.log`.

Repeated pre-push verification exposed a WebKit harness fault: pausing intercepted script requests
could stop animation frames despite a visible, focused document. React's streamed images then
stayed hidden until the held bundles resumed. Window order, navigation readiness, viewport setup
and a newer browser did not reliably fix it; all of those experiments were discarded.

A loopback gate instead holds real HTTP responses for only the app's static JavaScript. Routing
continues immediately, and explicit release still waits until native images have decoded. This
passed 40 focused WebKit repetitions, including the original viewport and shell-window order.
The gate cannot fetch arbitrary origins or image/API paths; its servers close after each test.
The combined suite also exposed cross-context WebKit frame stalls, so cases own fresh browser
processes. Capture the shell in the same window after the real page is finished, comparing its
geometry against both the saved pre-hydration and hydrated values. The full 18-case enabled suite
then passed in 54.9s, followed by 36/36 cases in a double repeat (1.9 minutes). The final sequential
root check, img check (87 tests plus types), full verification and packed fixture all passed;
the packed fixture passed 36/36 across both configurations (55.3s and 54.9s).
All original assertions, timeouts and dependencies remain, without retries, skips or fake frames.
An intentional failure in the temporary fixture confirmed that the fresh-browser fixture still
captures failure screenshots and traces. No intentionally failing test is part of the PR.
Final logs: `/tmp/img-round2-2-isolated-{check,img-check,verify,fixture}.log`;
repeat evidence: `/tmp/img-browser-isolated-repeat.log`.
Evidence: `/tmp/img-webkit-{scriptgate,gate-original}.log`; retained failing traces and probes are
under `/tmp/img-round2-webkit-red.d8oxnW` and `/tmp/img-webkit-debug.log`.

The README commit is `e946915`. Its CI run `34691609803` passed nine checks but failed the extra
direct-WebKit-before-JavaScript case. Earlier green repetitions did not establish a reliable fix.
Restoring Playwright's standard context fixture recovered full network/DOM traces; the custom
context had retained test steps and screenshots, but not the complete browser trace.

The approved done criteria require private redirects to decode before application JavaScript in
both browsers. Keep that proof, plus Chromium's extra direct-streaming proof. Direct WebKit uses
normal script loading: its extra held-bundle streaming scenario remains unverified, with React's
resolved content observed in hidden stream containers. This is not evidence of an API2 failure or
a production Safari defect. The HTTP gate and custom browser lifecycle were removed; no retries,
timeouts, authorization assertions, geometry checks or production hydration code were changed.
The scoped full browser run passed 18/18 (`/tmp/img-browser-scoped.log`); the packed matrix follows.

SDK receipt work now wraps one original-only Storage Assembly with an explicit complete path and
conflict errors. Thirty-three red-first tests pass, covering malformed receipts, chunked checksum
input, cancellation, progress, path policy and preserved SDK errors. `StoredImageReceipt` is public
and reaches the generated legacy wrapper. Validation is explicitly after the write, not rollback.

Receipt sources now supply readonly path/geometry and exclude redundant dimension props. Model,
placeholder and direct/redirect signing share a validated source snapshot; ancillary receipt fields
are ignored. Mutation tests reproduce and fix the redirect's original-props dimension read. Image
checks pass 105 tests plus type fixtures; the packed seed now calls the public SDK helper and feeds
its receipt into the public image model. Both production browser pages exercise object sources.

The node package check initially resolved a globally installed Biome 2.5.10 and reported an
unrelated existing SVG fixture. Putting this checkout's pinned Biome 2.4.16 first on PATH made
the package check pass (285 tests, one existing skip). Incidental formatter and generated intent-doc
changes were discarded; the unrelated fixture and dependency versions were not modified.

The final sequential root check, img package check, full verification and packed production matrix
passed. Browser results: 36/36, 54.1s enabled and 52.2s omitted, without retries or skips. The clean
literal Yarn consumer also passed all six seed cases, exact updated snippet parity, public model
execution, shared local utils resolution and TypeScript compilation. It uses the same four tarballs
as that browser matrix: `/tmp/img-receipts-yarn.JD5X0O`. Logs: `/tmp/img-round2-3-*.log`.

The receipt commit `4b330c6` is pushed and all GitHub checks passed, monitored with
`gh-run-watch.ts` (`/tmp/img-round2-3-watch.log`). The explicit-policy env factory is the remaining
commit: its initial 16 runtime regressions failed before implementation, then passed. Additional
invalid-policy cases and type tests retain explicit Storage access, loading/preload discrimination
and redirect-only props. It reads only the three conventional rendering variables once, delegates
to the explicit factory and never loads files or falls back to Assembly credentials.

The final env-factory verification passed: 126 img tests plus type fixtures, root check,
`verify:full`, and 36/36 packed browser cases (55.9s enabled, 54.5s omitted). The direct production
fixture uses the env helper with explicit test-only environment in both build and server processes.
Automatic request/error auditing remains active after removing an unused fixture parameter; every
browser case has response evidence and no retry or skip. A separate clean Yarn consumer verifies
the new literal factory, receipt render and seed, all six offline seed cases, the four local package
resolutions and public TypeScript exports: `/tmp/img-env-yarn.CRhRIp`.
Logs: `/tmp/img-round2-4-{img-check,final-check,verify,fixture,yarn-final-proof,yarn-types}.log`.

One earlier root run failed an unchanged notify-relay cookie test; both full reruns passed all
22 relay tests without changing that package. An isolated diagnostic was invalidated by an
overlapping generated-utils rebuild and was not counted as evidence. Likewise, a bare Node
react-server-condition probe cannot replace Next's client/server module boundaries; the env
factory's runtime proof is the two real Next production builds, not that extra standalone probe.
