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
