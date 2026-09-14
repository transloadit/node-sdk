# Round 7 onboarding review

Why: the public-image quickstart must remain secretless from login through the first image,
and errors must describe the API's actual wire contract.

PR: https://github.com/transloadit/node-sdk/pull/500

- [x] Diagnose unpublished paths via `Transloadit-Error: NO_SIGNATURE_FIELD`; retain generic
  HTTP 400 advice and path/template advice for 404.
- [x] Infer allowed public prefixes with an empty catalog; preserve explicit deny-all policies.
- [x] Public init writes only the workspace; private init retains rendering credentials.
- [x] Print bounded, constrained JSX from store and disclose the selected credential source.
- [x] Rename the policy listing command, normalize init prefixes and preflight Storage after login.
- [x] Keep the quickstart focused and reference details separate; qualify test and byte counts.
- [x] Run sequential package/repository/browser checks and council/Opus reviews.
- [x] Test the real login key with List + HEAD sync and a fresh public-only Next app in devdock.

Council's source-width clamp is covered red-first and in the packed browser matrix: a 320px
original cannot stretch to a larger constrained maxWidth. Final exact-head CI remains a merge
gate; package checks count executed parameterized cases, not test declarations.

No merge or publication in this round. No blur placeholder, origin version selector, workspace
picker or logout implementation. API2 owns the S3 eligibility and error-header changes; Console
owns real browser approval. Local canaries do not establish production Bunny latency.

## Round 8

Why: a public project needs one committed source of truth and familiar image props; the CLI
must not silently write into a different workspace than the application renders.

- [x] Commit workspace, public prefixes and receipts in `transloadit.images.json`; keep explicit
  `--receipts` paths, and require `--public` or `--private` at init.
- [x] Verify project/workspace binding before store, list, sync, publish and unpublish.
- [x] Default catalog/receipt images to constrained `width`; make `priority` eager/preload/high.
- [x] Derive art-direction container ratios from the same map as crop candidates.
- [x] Unify duration units, isolate experimental props, document explicit basePath and diagnose
  oversized candidates only in development.
- [x] Add scoped logout/status, multiple-file storage and copy-safe alt/Windows instructions.
- [x] Document deployment and release dependencies; remove unmeasured performance claims.
- [x] Run red-first tests, sequential package/full/browser checks, council, local UX/security,
  the live zero-env/mismatch/logout canary and exact-head green CI.

API2 b2264e1767 supplies `DELETE /auth_keys/self` and token `auth_key_id` / `description`. Real
packed login/status/logout passes in owned devdock17 without broad Auth Key management rights.
The zero-env public scaffold renders real unsigned images in Chromium/WebKit at desktop/mobile;
all five bound Storage commands refuse the wrong workspace before acting.

Council's large-original, height-only and bearer-token/fallback-credential findings were reproduced
red-first and fixed. UX review found no blockers. The mismatch wording is Kevin's explicit
contract; JSON-quoted generated imports deliberately escape arbitrary receipt-file paths safely.
CLI next-step wording is usable but could be more copy-paste-oriented in a later polish pass.
Security review's empty-discovery and endpoint-provenance edges are covered red-first; a changed
shell endpoint requires fresh workspace discovery. API2 keys are workspace-scoped, so ambiguous
multi-bucket responses fail closed with endpoint/key advice, not an ineffective override suggestion.
Private `--write-env` only persists the saved login, never transient shell fallback credentials.
The follow-up council caught imported application-key revocation: login now records its method;
logout forgets imported/legacy keys unless `--revoke` is explicit, and still revokes browser-login
keys. Docs warn that applications sharing a browser-login key also lose access on logout. Red-first
tests cover provenance spoofing in stdin, imported opt-in, legacy files, failed cleanup preserving
publication warnings, and actionable bearer-token advice. Actual runtime smoke tests showed JSON
import attributes need Node 20.10.0, beyond AbortSignal.any's 20.3.0 floor; both CLI manifests agree.
The next review's project-selected credential-file bypass is closed for both ownership flags;
only the shell-selected login path can retain verified provenance. Local-only logout can forget
unusable legacy credentials, but explicit revocation still requires a valid signing key.
`--no-revoke` is rejected rather than silently ignored. Recovery links use the command's actual
workspace. Red-first cases cover these boundaries; workspace-option precedence is documented.
Live logout also exposed the documented asynchronous API2 cache boundary: explicit revocation
soft-deletes immediately, while this daemon-free test uploader denied reads after 116 seconds.
The failed immediate-denial assumption is preserved; this is not a production revocation SLA.
Additional reviewed onboarding edges are covered red-first: nullable API2 signature algorithms,
private initialization beside existing public directories, and examples choosing only a receipt
under the requested directory. The packed fixture now builds these actual mixed-catalog outputs.
Login also snapshots its default home before dotenv injection, with an OS-user fallback for
Node's empty-HOME result, so a project cannot redirect new credentials through HOME/USERPROFILE.
The final lifecycle review restores explicit expiry at the signed-candidate boundary, detaches
long-lived browser openers and adds cooperative interrupt cleanup to the existing atomic catalog
writer. Active uploads/discovery/list/HEAD cancel; completed receipts checkpoint before exit.
An accepted Assembly may still finish remotely, and forced exits/crashes still need lock inspection.
Relative HOME values also fall back to the OS account directory. Empty examples and init output
now name the initialized directory. These cases are red-first and covered by real loopback S3
requests plus the packed fixture; the latest full `yarn check` passes.
Final review reconciliation forwards cancellation into publication HTTP calls too (publish,
unpublish and public init), distinguishes successful checkpoints from failed receipt recovery,
limits unversioned compatibility redirects to one shared-cache minute and clarifies JSON ETags.
Opener failures are warnings, not false login results on JSON stdout. All have red-first coverage.

Round 8 source verification is complete on `00f5ec097cb4809878343a31b6f85cb982ee796e`:
full `yarn check`, then img check → verify → packed fixture pass (258 img, 537 Node plus one
preexisting skip, 59 utils, 22 relay). Local and downloaded CI artifacts independently confirm
80 native browser passes with no retries, skips, flakes or unexpected errors. All jobs in
https://github.com/transloadit/node-sdk/actions/runs/34792479448 are green. Actual SIGINT/SIGTERM
tests pass across six stalled CLI phases, including publication, and targeted Opus review confirms
all final council fixes with no blockers. One preexisting Biome warning remains outside this scope.
The last full real API2/browser canary is explicitly `3e473f4` (20 observations, unrestricted key);
the final corrections above do not change its direct image byte path. The final report retains
failed runs, later passes and source hashes separately, including API2's asynchronous revocation
boundary. Task-owned services are stopped and API2's preexisting working changes are preserved.

No merge, package publication, Content changes, Thumbhash or origin version selector in this round.
Detailed local receipts, review reconciliation and remaining gates: `/tmp/img-task2-round8-report.md`.

## Round 8 signup-test addendum

Why: older deployments watermark Community uploads before Storage runs, so a successful write can differ
from the local file. The CLI must save authoritative receipt metadata and explain this, not invite
a destructive retry. Input: `/tmp/img-task2-round8-addendum.md` and the stranger signup report.

- [x] Accept valid single-original Storage results from the requested write despite changed bytes;
  preserve strict path/asset/dimension validation and separate trusted-fact Assembly recovery.
- [x] Save the actual receipt, warn about changed bytes/plan transformations, and show bounded
  debug comparison details. Missing receipts get list/sync recovery advice, never overwrite advice.
- [x] Make the README npm-first, explain signup/free-plan watermarks and align CLI help examples.
- [x] Report pending browser approval about once per minute without leaking credentials.
- [x] Explicit init delivery choice and self-key logout already implemented and covered in round 8.
- [x] Red-first tests, focused review, package/full/packed checks and exact-code-head green CI.

Console signup/redirect/sidebar fixes remain with its owner. No merge, publication or watermark
policy change is authorized by this addendum.
API2 `cb23326114` already exempts Storage originals from Community watermarking; qualify that
warning as compatibility with older deployments. Evidence: `/tmp/img-task2-round8-addendum-report.md`.

Completed code head `ce623e261393f41c5c7859ceb601c54daecee6f2`: full `yarn check`, then img check
and `verify:full` PASS (549 Node + one preexisting skip, 258 img, 59 utils, 22 relay and the
root/schema/MCP/type checks). All jobs in
https://github.com/transloadit/node-sdk/actions/runs/34795854316 are green. Its downloaded browser
artifact independently confirms 80 first-attempt Chromium/WebKit passes in both Cache Components
modes, zero retries/skips/flakes/unexpected errors. Evidence: `/tmp/img-r8a-final-ci-browser-audit.json`.

The six council findings and three minor Opus suggestions are fixed red-first; both focused Opus
UX/defensive-security reviews PASS. Recovery commands keep endpoint/workspace/catalog and use a
filename prefix, canceled/pending Assemblies retain status-specific messages, asynchronous receipt
observer errors are contained, and approval countdowns use a monotonic clock. Reference and sync
help now agree with the npm-first Quickstart; checksum-only transformations are explained too.

An ordinary npm-installed tarball of that exact head passes the real local Community canary on
API2 `b2264e1767`: store, default catalog, listing, receipt sync and byte-identical signed CDN
delivery. Its original-storage watermark exemption is confirmed. Compatibility with older
transformed results remains explicitly protocol-fake coverage, not live old-policy proof.
The failed extra readback was a missing tmp-hostname mapping after restarting the owned devdock;
only that container mapping was repaired. No API2 source/env, production policy or Console edits.
Temporary canary keys/credential files were removed, own devdock/S3rver stopped, existing API2
working changes preserved. The PR retains `Refs #270`, not `Fixes`, and its two open follow-ups.

Next gates remain unchanged: Console signup/redirect ownership, coordinated deployment/release,
ordinary registry-install and sustained Content dogfood, then production Bunny measurements.
This addendum does not authorize merging or publishing the private image package.

## Round 9 — stranger signup test 2

Input: /tmp/img-task2-round9-brief.md and /tmp/img-stranger-signup-report-r2.md (PASS in 6m13,
against earlier tarballs). “This fires on **every** load of the untouched `image init` page”
makes F11 the first fix. “a blank page with nothing on it at all” makes scaffold failure UI next.

- [x] F11: post-layout, decoded, non-tiny candidate measurements; native dev tests added.
- [x] F9: generated example displays delivery failures using the existing fallback API.
- [x] F10: remove unnecessary development-server restart advice without promising retries.
- [x] F2: identify saved credentials safely and show the non-destructive separate-file path.
- [x] F3: unique auth help from Clipanion definitions; all existing aliases retained.
- [x] README: short npm/pnpm entry, signup timing, tarballs, delivery override and Credentials label.
- [x] Red-first checks, council/Claude review and sequential package/packed checks.

Same PR; no merge, publication, production, Console or API2 changes. Keep Refs #270 and the
unchanged release gates above. Detailed quotes, decisions and evidence: /tmp/img-task2-round9-report.md.

Initial yarn check passes: img 262, node 558 plus one existing skip. Red-first failures cover
pre-layout diagnostics, missing scaffold fallback, restart advice, login context, duplicated
help and README entry points. The native dev matrix adds untouched desktop/mobile scaffolds
and a controlled 1px-to-960px real layout; final browser/review/CI receipts follow below.
F3 was alias expansion in prefix help, not duplicate command registration. No dependencies,
schema files, builtin pins or auth scopes changed.

First council found two valid follow-ups: scope the fallback locator past Next's route
announcer, and explain an approved-but-unsaved key after concurrent login rather than saying
“Nothing was changed”. Both are fixed red-first. Interactive desktop-to-mobile browser reuse
also exposed a density-correction false positive; compare CSS-pixel naturalWidth before blaming
sizes. Native tests cover both unchanged pages and cached-candidate reuse. The final verification
sequence and second, focused review are pending; initial CI only failed on the alert locator.

### Round 9 verification and handoff

The final local sequence passes: `yarn check`, then img check → verify → packed fixture.
Counts: 263 img, 560 Node plus one preexisting skip, 59 utils, 22 relay and the root/schema/MCP
checks. The downloaded/installable packages pass all 92 native Chromium/WebKit cases: 42 with
Cache Components enabled, 42 omitted and eight on the actual Next development server. An
independent audit confirms zero retries, skips, flakes and unexpected browser/network errors.

Two-reviewer council closure reports no issues; independent Opus UX and defensive-security reviews
both PASS. Manual npm-installed desktop/mobile evidence covers working images, cached native
candidate reuse, visible accessible failure and Fast Refresh recovery without restarting Next.
Real installed CLI help lists six unique auth commands and refuses to overwrite toy credentials
while identifying the saved file/workspace/description/date without printing secrets. A losing
device login explains its approved-but-unsaved key; a losing stdin login never suggests revoking
the existing application key it merely verified. Both races have red-first no-overwrite coverage.

The first closure CI run passed 91/92 cases: rewriting streamed dev HTML for the tiny-box test
caused WebKit to reload and cancel a devtools font. The test now changes only CSS after normal
hydration, verifies 1px → 960px and retained client state. Initial pre-layout timing remains
unit-tested; untouched native desktop/mobile loads and resize observation remain browser-tested.
No failed-request exemptions or retries were added. Its test-only Node handle typing error was
also fixed before the final full local repeat. The report preserves those failed attempts.

Exact-head green CI is the final handoff gate; its current receipt and audited downloaded artifact
are recorded in the [PR body](https://github.com/transloadit/node-sdk/pull/500) and
`/tmp/img-task2-round9-report.md`, so this source document does not require a self-referential SHA.
Local evidence: `/tmp/img-r9-evidence-OWBFjJ/`; final sequential logs: `/tmp/img-r9-final2-*.log`.
Own manual browsers and servers are stopped; the packed runner cleans its own servers.

The incoming 6m13 stranger-signup duration is not relabeled as a new timing on this head. Round 9
uses owned localhost contract fakes, not a new API2/Console or Bunny canary. No dependencies,
schemas, Built-in pins, auth scopes, Content/API2 source, env files or production settings changed.
The release gates remain: coordinated API2/Console rollout and package release, ordinary registry
installation, sustained Content dogfood and production Bunny measurements. No merge or publication
in this round; `@transloadit/img` remains private at 0.0.0 and #270's two follow-ups stay open.

### Round 9 follow-up — response-read ownership

Kevin reported `response.body: Test ended.` in run 34788426459 at cd9430a0eb. Its rerun passed,
but the same listener lifecycle remained at 3b26679: Promise.all snapshots a growing reads array,
leaving later response handlers unowned during teardown. No product behavior is implicated.

- [x] Reproduce deterministically in both real browser engines by holding the audit's body read
  while the image decodes normally; old cleanup incorrectly completes before that read is released.
- [x] Return the response handler's async work to Playwright, then remove/drain those listeners
  before page/probe closure. Remove the manual reads array; preserve native read failures.
- [x] Focused council: no issues found. Packed browser matrix: 44 enabled + 44 omitted + 8
  development cases pass on their first attempts, with all response-audit attachments checked.

The final gate is the required local checks and exact-head CI/artifact verification; their
commit-stamped receipts live in the report and PR body below, not in a second docs-only CI loop.

Keep this correction test-only. Evidence and current-head CI receipts are appended to
`/tmp/img-task2-round9-report.md` and the PR body; the red browser artifact is
`/tmp/img-r9-response-race-red-artifact`. No ignoreErrors, extra retry, timeout increase,
product change, merge, publication or new framework is part of this fix.

## Round 10 — final reader residuals

Input: `/tmp/img-task2-round10-brief.md` and `/tmp/img-stranger-signup-report-r3.md`.
The independent reader passed in 4m58 on 3b26679 (API2 b2264e1767, Content 40210c67f1).
That is the reader's existing timing, not a new measurement by this round.

- [x] F9: print the actual development HEAD origin/path, stripping query credentials. Explain
  HTTP failure versus an unreachable host and point non-default setups at baseUrl/urlParams.
  Preserve the existing publication/auth/404 hints, background timing and production silence.
- [x] Six README clarifications: workspace-derived delivery host, persisted login endpoint,
  separate credentials file by the logout warning, Console Credentials path without a placeholder
  link, optional src/ layout, and bring-your-own hero JPEG. No new onboarding feature.
- [x] Red-first diagnostic tests: seven failures before the fix, then all 163 affected tests pass.
  Focused council found only the shell-versus-project-env wording; fixed red-first in the README.

Required local checks, packed browser proof, final exact-head CI/artifact receipts and PR-body verification go in
`/tmp/img-task2-round10-report.md`. Stop after this round: no merge, publication, API2/Content
changes, environment edits, new reader round or extra product work. img stays private at 0.0.0.

## Round 11 — recovery and reader follow-ups

Input: `/tmp/img-task2-round11-brief.md`, with both independent round-8 Rauch reports read.
Work remains in #500 on `img-onboard`; no merge, publication or production changes.

- [x] Recover server-declared public policy atomically with receipts; preserve the catalog on
  policy failure. Never infer publication from a folder name.
- [x] Document a separate application key for private deployment, not the revocable CLI key.
- [x] S3 availability/403 handling; non-production init delivery override; dev HEAD fallback.
- [x] preload vocabulary, typed scaffold and store snippets, concise output, publication dry run.
- [x] Quickstart-first README and reference accuracy; browser device-denial contract.
- [x] Triage both focused councils and the Opus UX/security review; add red-first regressions.
- [x] Condense the PR body, preserving historical evidence in maintainer documentation.

Pre-review full `yarn check` passes: 267 img and 571 Node tests (one existing skip).
Native desktop/mobile proof and independent Opus UX/security reviews pass on the initial head.
Council's shell-quoting and custom-catalog findings are fixed red-first. The Opus follow-up fixes
scaffold formatting, stale alt docs and missing empty-policy guidance. The workspace env override
remains the explicit round-8 contract, now documented. Final packed verification also replaces its
stale empty-scaffold assertion; that initial local/CI failure is retained in the report.
The closure council's multiline assertion and portable absolute-catalog follow-up are fixed;
full `yarn check` now passes with 268 img and 572 Node tests (one existing skip).
Cold-checkout CI then exposed the generator's unnecessary receipt-module import. The CLI now
owns the default catalog argument, keeping source generation independent of built packages;
a child-process cold-load regression fails first and passes after the correction.
The final handoff gate is img check → verify → packed browser proof → exact-head green CI.
Its current commit-stamped result is recorded in the report and PR body rather than a
self-referential docs-only commit. No merge or publication is authorized by passing this gate.

Progress and red/green evidence: `/tmp/img-task2-round11-report.md`. Immutable identity and
image doctor remain out of scope. `@transloadit/img` stays private at 0.0.0.

## Round 12 — package-first Next.js integration

Kevin's decision: `/tmp/img-task2-round12-brief.md`. Keep #500, private 0.0.0, no
merge, publication or production changes. Current main is already an ancestor; no open GitHub
review threads were present at preflight.

- [x] Store owns the catalog, generates committed types, and explicitly publishes with --public.
- [x] A Next config plugin binds the conventional catalog and private authorizer; direct package
  import reuses the existing renderer. Do not promise a runtime filesystem fallback without
  proving tracing and host portability.
- [x] Generated module augmentation narrows src; without it string sources still use catalog sizes.
- [x] Private convention exports one authorize function and re-exports the package route handler.
- [x] Keep explicit factories and opt-in example/private scaffolding working.
- [x] Quickstart/reference/dogfood and packed fixture exercise both integration paths.
- [ ] Reconcile council and local UX/security evidence, then img check → verify → packed fixture
  and exact-head green CI. Update the one-screen PR body and stop.

The implementation was recovered after an external cleanup selected the active checkout. Work
continues in Kevin's reserved node-sdk checkout, with no new clone or worktree. img check and verify
pass (277 img, 581 Node plus one existing skip). The packed browser gate remains pending.
Its initial failure caught Turbopack excluding .next as an import source; generated nonsecret
options now live under node_modules/.cache, while the catalog stays the single source of truth.
The generated wrapper README is synchronized. A red-first follow-up aligns CLI catalog transport
validation with the renderer's parameter-only and repeated-query options.

Report and commit-stamped evidence: `/tmp/img-task2-round12-report.md`.
