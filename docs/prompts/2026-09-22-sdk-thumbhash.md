# Server-owned placeholders in SDK and Viewer

## Scope and ownership

API2 #9182 is merged at `dd46b1e6da`; production deployment and the nullable version-metadata
migration remain Kevin/deployer-owned. Node/legacy 4.13.1 already removed local image decoding.

Kevin explicitly authorized `/Users/kvz/code/node-sdk-clone-1` because another agent owns the
original SDK checkout. Work on `thumbhash-sdk` from main `8f7813d2`; do not modify that agent's
`opus55-images25` branch or create more checkouts.

## Contract

- `storeImage(..., { placeholder: 'blur' })` and `storage store --placeholder blur` opt into
  `output_meta.thumbhash` on the original upload producer. Omission/empty does not extract or bill.
- Optional `thumbhash` and canonical `has_alpha` survive original receipts, recovery, batch results,
  native current/pinned lookups and catalog sync. Viewer still reads legacy `hasAlpha` catalogs.
- Extraction is best-effort. Missing metadata never retries an upload or overwrites a hashed object.
- No native decoder enters either SDK package. Viewer continues server-only rendering, with no
  private pixels embedded before request authorization and no persistent blur under alpha images.
- A full API-documentation schema migration is outside this slice; sync only the required contract
  and dependencies. No new Built-in, backend feature, Terraform change or Uppy work is needed.

## Verification checklist

- [x] Red-first metadata transport, opt-in and canonical/legacy alpha tests.
- [x] CLI store/sync/generated types and no-upload replay regressions.
- [x] Canonical contract, SDK helpers and Viewer implementation.
- [x] README/reference/CLI help and Changesets release notes.
- [x] Required checks, packed Next browser fixture and native-free SDK/legacy Supabase probes.
- [ ] Council review and reconciliation; browser evidence/review when available.
- [ ] Open PR and monitor exact-head CI to green.
- [ ] After API2 deployment: live upload -> native metadata -> recovered catalog -> Viewer proof.
- [ ] After approval: Changesets release, Viewer explicitly alpha; then Content pin/dogfood.

## Evidence

Initial read-only research and six-route reproduction: `/tmp/sdk-edge-proof.Q6s4cJ/`.
This implementation's checks are recorded below as they run. Deterministic test doubles do not
prove the new backend is deployed. No release or production mutation is implied by a green PR.

- The first SDK/Viewer run reproduced 15 failures; the CLI run reproduced seven failures.
  The six focused suites then passed all 308 tests. Repository TypeScript checks pass.
- A trial full storage schema sync pulled in API2's documentation registry and failed the SDK's
  generated type package (`Cannot find namespace z`). Kept only the canonical placeholder fields,
  validators and descriptions, plus the corresponding Assembly fields and Robot help. The unrelated
  registry/translation migration remains out of scope; no new runtime dependencies were introduced.
- The packed browser fixture now calls the actual SDK upload helper and CLI; only createAssembly
  is simulated. Its saved canonical receipts feed the public, alpha and private browser cases.
- `yarn check` and `yarn verify:full` passed, including generated packages, legacy wrapper sync,
  Knip and Zod type tests. Existing Vitest/coverage version and lint warnings remain unchanged.
- The packed Next fixture passed 58 Chromium/WebKit tests with Cache Components, 58 without,
  and 10 development tests. Public blur and transparency are browser-covered; explicit private
  blur omission is additionally asserted in `storage-factory.test.tsx`.
- Both packed SDK names bundled and ran in pinned Supabase Edge Runtime, with zero native files.
  The measured upload bundles were 2,454,452 bytes (Node) and 2,458,747 bytes (legacy), inside the
  5 MiB regression gate. No dependency or lockfile changes are part of this slice.
- Browser evidence: `/tmp/sdk-thumbhash-usertest-UP9K1d/`. The interactive desktop/mobile pass
  checked native decoding, no horizontal overflow, transparent/letterboxed backgrounds, and
  anonymous fallback -> local sign-in -> decoded private image without a shell reload.
  Only a synthetic backend/CDN was used. The first temporary handoff helper had an import-resolution
  error after its 58 tests passed; a Playwright-owned handoff fixed that tooling issue. Its server
  (PID 90260) and the dedicated browser session were stopped after capture.

## Council reconciliation

- [x] P2: preserve ownership recognition of old headerless generated declarations. LF and CRLF
  upgrade tests failed first. Ownership checks now reproduce the historical declaration format;
  new declarations carry the catalog header and canonical alpha field. A foreign-image declaration
  still blocks the update before any write. All 148 targeted CLI tests pass. An earlier parallel
  run timed out in an existing sync case under local load; unchanged code passed serially.
- [ ] Independent Opus browser-evidence review and final reconciliation.
- The council consolidated the review to the P2 above. Speculative malformed-server metadata and
  unpaired hash/alpha suggestions were not treated as extraction failures: the server emits a
  bounded valid pair or omits it, while response validation remains strict. Same-version legacy
  evidence remains readable; another version never inherits its placeholder.

## Deployment and release sequence

1. Kevin/deployer applies `migrations/2026-09-22-add-dam-version-placeholders.sql` before rolling
   out API2 #9182. It adds nullable version metadata only; there is no automatic backfill.
2. Prove a real opt-in upload, native asset read, receipt recovery/sync and Viewer rendering on that
   deployment, including opaque, alpha and an extraction-unavailable input.
3. Release through the Changesets version PR, not an ad-hoc npm publication. Node/legacy, Types and
   Zod have minor notes; MCP follows its SDK dependency. Viewer receives a patch and remains
   explicitly alpha. Check the published dependency/bundle gate again.
4. Pin the published Viewer in Content and dogfood Storage ingestion separately. The existing
   website-images-bridge migration is not silently switched to Storage by this SDK PR. Uppy stays
   with its team. No Terraform or Built-in change is needed here.

https://github.com/transloadit/api2/pull/9182
