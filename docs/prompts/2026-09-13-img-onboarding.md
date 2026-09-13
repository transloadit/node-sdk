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
- [ ] Run red-first tests, sequential package/full/browser checks, council, local UX/security,
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
No merge, package publication, Content changes, Thumbhash or origin version selector in this round.
Detailed local receipts, review reconciliation and remaining gates: `/tmp/img-task2-round8-report.md`.
