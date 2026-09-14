# `@transloadit/img` local dogfood and verification

These are maintainer-only packing, SDK seed and devdock notes, not consumer prerequisites.
Use the [package README](../packages/img/README.md) for the application integration.

Responsive previews of Transloadit Storage objects, delivered through Smart CDN.

Round 12's default integration is package-first: login, `storage store ./hero.jpg website/hero.jpg
--public`, `withTransloaditImages` in Next config, and `StorageImage` imported from
`@transloadit/img/next`. Commit both `transloadit.images.json` and `transloadit-images.d.ts`.
`image init` and the explicit SDK/factory recipes below are optional alternatives.

The package renders native `<picture>`, `srcset`, and `<img>` elements. Image bytes travel directly
from Smart CDN to the browser; they are never optimized or proxied by the Next.js application.
Remote HTTP URLs are deliberately outside this package's source contract: an image must already
belong to the configured Transloadit Storage workspace.

This workspace remains private at version `0.0.0` while the API and production dogfood soak. Do not
depend on it from npm yet.

## Seed your first image

This walkthrough uses Node.js 24.11 or newer and an existing Next.js 16 App Router app. The
workspace must have Transloadit Storage writes enabled; package installation does not enable them.
Private delivery requires `builtin/storage-preview@0.0.2`. Public delivery additionally requires
`builtin/public-preview@0.0.1` and server-declared public prefixes. Browser login and combined
credentials require the matching API2 #9057 and Console changes; the older canary revisions
below predate these additions. Later owned devdock checks verified actual public delivery and
device login with scripted signed approval. They did not test the Console UI or production Bunny.
Private preview 0.0.1 stays unchanged and flattens transparency;
0.0.2 accepts `bg` for alpha-preserving candidates and the opaque JPEG fallback.

The server entry point needs the **Node.js runtime**, not Edge: it uses `node:crypto` and `Buffer`.
The examples use root `app/` and `lib/` directories; adjust their relative imports for `src/app/`.
Keep the app's stock Next.js TypeScript configuration and Node/React type dependencies.

### Install the local packages

Use a clean checkout of [transloadit/node-sdk](https://github.com/transloadit/node-sdk), at the
reviewed revision of [PR #500](https://github.com/transloadit/node-sdk/pull/500). For example,
`gh pr checkout 500` selects that PR; record `git rev-parse HEAD` before packing. From that SDK
checkout, install its locked dependencies and pack into your own temporary directory:

```bash
corepack yarn install --immutable
img_pack_dir=$(mktemp -d)
corepack yarn workspace @transloadit/img pack --out "$img_pack_dir/transloadit-img.tgz"
corepack yarn workspace @transloadit/node pack --out "$img_pack_dir/transloadit-node.tgz"
corepack yarn workspace @transloadit/types pack --out "$img_pack_dir/transloadit-types.tgz"
corepack yarn workspace @transloadit/utils pack --out "$img_pack_dir/transloadit-utils.tgz"
printf '%s\n' "$img_pack_dir"
```

In the same terminal, switch to a stock Next.js app created with npm and install all four local
tarballs. npm deduplicates the matching local workspace versions without a manual manifest edit:

```bash
npm install "$img_pack_dir/transloadit-img.tgz" "$img_pack_dir/transloadit-utils.tgz"
npm install -D "$img_pack_dir/transloadit-node.tgz" "$img_pack_dir/transloadit-types.tgz"
```

The Assembly client is a seed-only development dependency. The optional instruction types are used
by the packed recipe's tests and by advanced `createAssembly()` calls, not the seed helper. Utils is a real
runtime dependency of img; the local tarballs are specific to this unpublished walkthrough.
Img does not add the Assembly client to the browser or create an Assembly for each render. Keep
the tarballs available for reinstalls; do not commit machine-specific paths as a production setup.

For the ordinary first-image flow, return to the package README and use `npx --no transloadit` in place
of `yarn transloadit`. The explicit SDK seed below is an advanced maintainer alternative, not a
prerequisite for `auth login` or `storage store`.

### Advanced alternative: configure a standalone seed script

Skip this section when using `auth login` and `storage store`; those commands already seed the image.

Use credentials from the **same workspace**. A Smart CDN-enabled Auth Key can serve both purposes
on the combined-key API2 revision; separate keys remain optional. This advanced script retains
explicit Assembly variable names to avoid accidentally loading a local endpoint into Next. Add both
`.env.seed.local` and `.env.local` to the app's `.gitignore` before creating them:

The seed below selects `signatureAlgorithm: 'sha256'` for a combined key. A legacy Assembly-only
key may require `'sha384'` instead; match the algorithm configured on that key. CLI browser login
stores this metadata automatically for subsequent CLI requests.

- `TRANSLOADIT_ASSEMBLY_KEY` and `TRANSLOADIT_ASSEMBLY_SECRET`: an **Assembly Auth Key** and its
  secret, used to sign the one-time upload/store Assembly. Put these in **`.env.seed.local`**,
  loaded only by the seed command below.
- `TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET`: a **Smart CDN Auth Key** and its
  secret, used to sign delivery URLs. Put these in **`.env.local`** for Next.js. An Assembly-only
  key cannot replace this key.
- `TRANSLOADIT_WORKSPACE`: put the workspace's URL slug in `.env.local` too. In a Console URL such
  as `/c/my-workspace/`, the slug is `my-workspace`, not a key or workspace ID.

Do not use a `NEXT_PUBLIC_` prefix or commit credentials. Public-only rendering needs just the
workspace, not a key. Private rendering accepts `TRANSLOADIT_KEY/SECRET` or the explicit Smart CDN
override pair above. Next.js loads `.env.local`; all keys placed there must remain server-only.
`.env.seed.local` is outside Next's normal env-file names. Manage keys in the
[workspace Console](https://transloadit.com/c/<workspace>/template-credentials/).

`TRANSLOADIT_ASSEMBLY_ENDPOINT` is an optional seed-only override. Omit it for the SDK default,
`https://api2.transloadit.com`; the local-devdock case is explained below.

### Store one image and keep its verified metadata

Save this as `seed.ts` in the app. `client.storeImage(filePath, { path })` uses your Assembly key
to store one local original at an explicit complete destination path. It streams the checksum,
waits for completion and verifies exactly one matching receipt: a nonempty typed `asset_id`, exact
path, byte count, MD5, and positive safe-integer image dimensions. It returns `StoredImageReceipt`.

Underneath, one `/transloadit/store` Assembly annotates its input: the receipt is in
**`results[':original']`**, not `results.stored`. Those fields were verified in a real Storage canary.

```ts
import type { StoredImageReceipt } from '@transloadit/node'

import { Transloadit } from '@transloadit/node'

/** Seed with an Assembly key, then save the receipt for rendering without another lookup. */
export function seedStorageImage(
  client: Transloadit,
  filePath: string,
  path: string,
): Promise<StoredImageReceipt> {
  return client.storeImage(filePath, { path })
}

async function main(): Promise<void> {
  const authKey = process.env.TRANSLOADIT_ASSEMBLY_KEY
  const authSecret = process.env.TRANSLOADIT_ASSEMBLY_SECRET
  const [filePath, path] = process.argv.slice(2)
  if (!authKey || !authSecret || !filePath || !path) {
    throw new Error(
      'Provide an Assembly key/secret and run: node seed.ts ./image.jpg website/image.jpg',
    )
  }
  const client = new Transloadit({
    authKey,
    authSecret,
    signatureAlgorithm: 'sha256',
    endpoint: process.env.TRANSLOADIT_ASSEMBLY_ENDPOINT,
  })
  console.log(JSON.stringify(await seedStorageImage(client, filePath, path), null, 2))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
```

Run it once for an image you want to store, keeping the printed record as app data:

<!-- seed-receipt-command -->
```bash
(
  set -e
  receipt_tmp=$(mktemp ./image.json.XXXXXX)
  trap 'rm -f "$receipt_tmp"' EXIT
  node --env-file=.env.seed.local seed.ts ./canal-house.jpg website/canal-house.jpg > "$receipt_tmp"
  mv "$receipt_tmp" image.json
)
```
<!-- /seed-receipt-command -->

The temporary sibling is renamed only after success. A failed rerun preserves the previous receipt.

The helper requires the full filename, not a directory or an interpolation expression. Advanced
`createAssembly()` instructions can use the single-quoted `'website/${file.url_name}'` literal:
Transloadit, not JavaScript, substitutes the input's URL-safe filename in that expression. Node 24 detects
ES module syntax when `package.json` has no `type`; explicit `"type": "commonjs"` is different.
The stock create-next-app manifest needs no change for this native TypeScript seed. No tsx or
ts-node runner is needed. See [Node's module detection](https://nodejs.org/download/release/v24.11.0/docs/api/packages.html#syntax-detection).

Proceed only when the command exits successfully. `conflict_strategy: 'error'` makes a repeated
upload to the same path fail rather than silently replacing an asset. Choose a different filename
or explicitly set `overwrite: true` (CLI: `--overwrite`). Do not modify the input file while
it is being checksummed and uploaded. Receipt validation happens **after the Storage write**:
a validation error is not a rollback, and retrying the same path can encounter the stored object.
An `InconsistentResponseError` retains `cause.assemblyId` for investigation without copying the
Assembly response. Existing API, timeout and cancellation errors propagate unchanged.

The helper also accepts `signal`, `chunkSize`, `onUploadProgress`, `onAssemblyProgress` and the
existing Assembly `timeout` (upload/polling, not local checksum time). It never accepts replacement
steps. Overwrite remains opt-in. Use `createAssembly()` for multi-file or transformation workflows.

The resulting JSON contains `asset_id`, `path`, `size`, `md5hash`, `width`, and `height`. Keep it
alongside your content or in your application's database; rendering needs no metadata request.
The dimensions account for EXIF orientation, matching Storage preview's automatic rotation:
a stored 450×600 photo tagged “Rotate 90 CW” returns a 600×450 display size.
The `asset_id` identifies the stored asset. Pass the whole receipt as `src`; its path and dimensions
drive rendering. Public URLs also carry an MD5-derived `v` cache tag; that tag is not an immutable
origin version selector. Receipt IDs and other upload-only fields do not enter markup. The rendering
package does not import the Assembly client.

### Direct devdock origin

For a local devdock seed only, set `TRANSLOADIT_ASSEMBLY_ENDPOINT` to your trusted Assembly API
endpoint. This is separate from the Smart CDN origin. For direct devdock image delivery, configure
the image factory with the trusted URL Transform `baseUrl` (including its `{workspace}` placeholder)
and `urlParams: { cdn: 'required' }`. This supplies API2's explicit `cdn: required` acknowledgment
because native image requests cannot attach a custom header. It does **not** install a CDN or
bypass access policy. Private URLs still require a Smart CDN-enabled key; public URLs require a
published prefix. Never take either endpoint override from a request.
Normal Smart CDN delivery needs neither local override.
`createStorageImages` accepts these same `baseUrl` and `urlParams` fields directly,
alongside `allowedPathPrefixes` and `authorize`.

The factory exports `StorageImage`. Use one flat `createStorageImages({ images, public })`
shape for the public Content hero, with catalog-typed src and fill/cover breakpoint ratios.
Public direct markup is static; private direct images remain request-rendered. See the package
README for layout and authorization policy; this document only covers maintainer setup.

Before publication, a Yarn consumer may resolve a registry copy of `@transloadit/utils` under
the image package even when the new utilities tarball is a direct dependency. For local dogfood,
explicitly resolve that dependency to the same packed utilities. The release must bump utilities
and the dependent minimum versions together; publishing img against the old minimum is unsafe.

### Live Storage listing and rendering receipt recovery

The historical oriented-receipt canary used API2 `07ec5abc2b71d449a7474391c8eeef4934ef3589`.
It is stopped while waiting for the public/login revision. Only that internal-only, port-free devdock's
`env.sh` custom overrides enable `API2_STORAGE_S3_ENABLED=true`. Production remains unchanged.

`transloadit storage ls website/ --json` discovers the workspace and lists the existing images,
including `website/stranger4.jpg` from the accepted stranger trial. Its 92,230-byte size and ETag
match the saved receipt. The command succeeds using the endpoint saved with ordinary read-scoped
Auth Key credentials, even with an unrelated bearer token present. An explicit `--endpoint`
overrides a saved local decoy; without that override the same decoy is reached. An unmatched prefix
returns an empty list, a different workspace returns 404, and unsigned HEAD returns 403.
These are real signed HTTP requests to API2, not mocked listing responses or new Storage writes.

The first disabled-controller probe failed with HTTP 403. After enabling it, the canary's special
Assembly-admin shortcut was rejected with `InvalidAccessKeyId`; an existing normal read-scoped
workspace Auth Key works. No key was created or broadened, and Smart CDN credentials are not used
for listing. This local fixture distinction does not require an SDK authentication workaround.

Public current and versioned HEAD/GET now return `dam-width=1024` and `dam-height=683` for the
stranger image. GET bytes match its saved MD5 and byte count. This closes the missing-public-
dimensions gap recorded against the earlier `5235a3605f` head. An asset ID is not needed for
rendering: `storage receipts sync <prefix> --receipts images.json` uses signed List + HEAD to
recover path/width/height and an MD5 only when its ETag is compatible. No original downloads,
Assemblies, private backing-store credentials or fabricated upload-integrity fields are needed.
Keep committing the generated JSON before building; it is now recoverable from catalog metadata.

The rotated-photo discrepancy is fixed and independently verified on `07ec5abc2b`. Two fresh
uploads preserve their original bytes while reporting display-oriented dimensions everywhere:
`rotated_8.jpg` is encoded 450×600 and displays at 600×450; `receipt-exif-orientation.jpg` is encoded
616×800 and displays at 800×616. Both carry EXIF orientation 6, independently read with ExifTool.
SDK receipts, current asset/version rows, backing object metadata, current/versioned public
HEAD/GET and the actual packed receipts-sync CLI all agree. The recovered JSON has both expected
display sizes and original MD5s, without fabricated asset IDs.

Older `website/construction.jpg` still has no dimensions, so a sync containing it must fail without
replacing the existing file. New uploads used fresh paths; this proof does not backfill historical
objects. No API2 implementation or canonical schema was changed by this SDK follow-up.

Current oriented proof: `/tmp/img-exif-live.log`, clone17's `tmp/img-exif-sync-result.json`
(2026-09-13T01:20:12.868Z). The earlier failed `b4aba072ee` upload/HEAD assertion remains in
`tmp/img-sync-oriented-receipt.json`; listing/endpoint proofs remain in `/tmp/img-sync2-head.log`
and `/tmp/img-storage-ls-result.md` as historical evidence.

The actual packed `storage receipts sync website/stranger --receipts images.json --json` failed
first on the old package, then passed after normal installation of the new SDK tarball. It
recovered all three stranger images at 1024×683 with the original MD5, without asset IDs. The
explicit endpoint bypassed a saved decoy; without override the decoy was reached. Empty results
preserved existing entries, and including the legacy object with missing dimensions failed
without changing the complete prior file. Evidence: `/tmp/img-sync2-live-{red,green}.log` and
clone17's `tmp/img-sync2-cli-result.json` (2026-09-12T22:22:14.120Z).

## Verification

```console
corepack yarn workspace @transloadit/img check
corepack yarn test:img:fixture
```

The fixture packs all four local artifacts and installs them with its pinned **npm** lockfile into
a clean Next.js app. It executes this exact seed recipe against mocked Assembly receipts without
network access and compiles it against the packed SDK/types. It builds and serves both production
Cache Components configurations, then runs 72 Chromium/WebKit cases (18 cases × 2 engines ×
2 configurations): native cookie authorization,
GET/HEAD parity, explicit public-prefix caching, responsive art direction with real cropped bytes,
separate app/CDN hosts, constrained hero/fixed avatar geometry, portrait fillcrop, optional error
fallback and same-page sign-in/refresh recovery, the actual CLI-generated empty and populated pages,
unsigned public Built-in policy and immutable versioned responses, the constrained public page
without a CSS reset, private-redirect decoding before application JavaScript, hydration, bounded JPEG fallback,
original-capability renewal, revocation, expiry and tampering. Chromium
also verifies direct streaming before application JavaScript; direct WebKit navigation uses normal
script loading because holding bundles can stall React's streaming reveal in the test browser.
That extra WebKit pre-JS scenario remains unverified. The owned
local image origin independently enforces signatures/expiry and declared public prefixes, then serves real encoded bytes; it
never receives the application's session cookie. Transparent AVIF/WebP/PNG corners and the signed
opaque JPEG background are checked at the pixel level. This origin emulates the Built-in contract;
it does not execute API2's transformation pipeline. Secret scans cover rendered/client artifacts.
The generated public-only application also builds in both modes with no signing credentials.

The test records browser evidence and direct-versus-redirect HTML size and route work for 1, 20,
and 100 images. Wall-clock measurements are diagnostic, not CI performance thresholds. This local
proof does not measure production CDN latency/caching or prove the deployed API2 pipeline.
The fixture checks the packed dependency graph independently of the own-devdock consumer test.

## Archived PR verification through round 10

The following commit-stamped ledger previously lived in #500's description. It records historical
checks, not a claim that they ran on the latest head. Current round-11 receipts are recorded separately.

## Round 8 verification

Source verification on `00f5ec0` (all review findings reconciled):

- `@transloadit/img check`: 258 tests plus type checks pass.
- Full repository verification including knip/types: 537 Node tests pass (one preexisting skip),
  plus the image, utils, schema and relay checks.
- Packed native Chromium/WebKit fixture: 80 first-attempt passes with Cache Components enabled
  and omitted. Independently audited local and downloaded CI evidence has no skips, retries,
  flakes or unexpected errors.
- [Exact-source CI](https://github.com/transloadit/node-sdk/actions/runs/34792479448) is green:
  Verify fast/full, Node 20/22/24, E2E, release dry run and the browser fixture.
- Final documentation-only head `5561c31` also has
  [green CI](https://github.com/transloadit/node-sdk/actions/runs/34793045157); its downloaded
  browser artifact independently passes the same 80-case audit, without retries or skips.
- Live API2 `b2264e1767`: ordinary packed installation, fresh zero-env public scaffold, actual
  device login/key metadata, five wrong-workspace refusals, upload, List + HEAD recovery, decoded
  direct public delivery at desktop/mobile, unpublish and self-revoking logout all pass at 3e473f4,
  including API2's unrestricted (`signature_algo: null`) key. Final fixes do not change the direct
  image byte path; the real API2 receipt remains explicitly stamped `3e473f4`, not relabeled.
  The unchanged consent/logout path
  separately passes all 14 live checks, including imported-key consent and negated-flag refusal.
- Actual OS SIGINT and SIGTERM sent to the current built CLI during stalled discovery, listing,
  HEAD, publish, unpublish and public init: all twelve cases preserve the catalog and remove its
  lock with a graceful exit. The packed fixture also builds generated mixed-catalog
  public/private scaffolds rather than only hand-maintained examples.
- Claude UX and defensive security reviews pass; their useful findings were fixed red-first.
  Council findings are fixed with regression coverage; targeted Opus closure reports PASS with
  no blockers. One unrelated preexisting lint warning remains; verification has no errors.

The live canary uses only the owned local API2/devdock and toy object storage. Scripted signed
device approval is not proof of the production Console UI or a human onboarding time.
Safe CLI logout uses API2's `DELETE /auth_keys/self`; no broad Auth Key management scope is added.
Both CLI manifests require Node 20.10.0+ for their actual JSON import/cancellation primitives.
Temporary local keys/publications were cleaned up and task-owned servers stopped. No claim of
production Console or Windows runtime coverage. Local report: `/tmp/img-task2-round8-report.md`.

## Round 8 signup-test addendum

On `ce623e2`, a completed Storage write uses the Assembly's authoritative receipt even when
the server changes the upload bytes. The CLI saves that metadata, explains changed bytes or
checksums, and does not suggest overwriting. External Assembly-ID recovery remains strict.
Missing receipts get targeted, shell-quoted list/sync commands preserving the selected endpoint,
workspace and catalog. Canceled/in-progress Assemblies retain their status-specific message.

README/reference commands are npm-first, signup is explained, and store/sync help agree on
`transloadit.images.json`. Waiting browser approval emits a safe stderr heartbeat every minute.
Debug output is restricted to verified receipt facts, Assembly ID and comparisons; raw Assembly
responses, signed URLs and credentials are never dumped. Async observer failures are contained.

The six council findings and three minor Opus suggestions were fixed red-first. Full local
`yarn check` passes: 549 Node tests (one preexisting skip), 258 img plus utils/schema/relay checks.
The packed Chromium/WebKit matrix passed 80 first attempts after the six review fixes. All
jobs in [code-head CI](https://github.com/transloadit/node-sdk/actions/runs/34795854316) are green;
its downloaded browser artifact independently confirms 80 first attempts with zero retries,
skips, flakes or unexpected errors, including the final warning/help/reference polish.
Opus returned PASS/no blockers for the changed UX and defensive-security boundaries.

Real Community-plan canary with an ordinary npm-installed `ce623e2` tarball: store, default
catalog, listing, receipt sync and byte-identical signed CDN delivery pass. API2 `b2264e1767`
already exempts stored originals from watermarking; older transformed-response compatibility is
tested with protocol fakes, not claimed as live old-policy coverage. The temporary local DNS
failure was traced to the owned devdock's missing tmp hostname and repaired without API2 source,
env or production changes. Console signup/redirect fixes remain with their owner.
Detailed evidence and limitations: `/tmp/img-task2-round8-addendum-report.md`.
Final documentation-only head `c7017d3` also has
[green CI](https://github.com/transloadit/node-sdk/actions/runs/34796223956); its downloaded
browser artifact separately confirms the same 80 first-attempt passes without retries or skips.

## Round 9 — stranger-test follow-ups

Completed on `3b26679d4d618334e2cb58270caeac595abe6306`:

- F11: development size hints wait for decoded, laid-out images, ignore transient 0/1px boxes
  and account for native density correction. Correct cached desktop candidates reused on mobile
  no longer blame `sizes`; genuinely oversized candidates still warn.
- F9/F10: the generated scaffold includes an accessible visible delivery-error fallback and
  explains decorative alt text. Diagnostics no longer prescribe an unnecessary server restart.
- F2/F3: existing-login refusals name the safe saved identity, file and modification date and
  offer a separate credentials file. Concurrent logins preserve the winner and distinguish newly
  approved keys from imported application keys. Auth help lists each command once, retaining aliases.
- README: short npm/pnpm/Yarn entry, maintainer-supplied unpublished tarballs, signup/code timing,
  Next.js floor, named delivery overrides and the actual Console **Credentials** sidebar label.

Verification:

- Full `yarn check`, then sequential img check → verify → packed consumer fixture pass:
  263 image tests, 560 Node tests plus one preexisting skip, and utils/schema/relay/root/MCP checks.
- [Exact-head CI](https://github.com/transloadit/node-sdk/actions/runs/34800196222) is green on
  its first run attempt: Verify fast/full, Node 20/22/24, E2E, release dry run and browser fixture.
- Independently audited local and downloaded CI artifacts confirm **92 native Chromium/WebKit
  first-attempt passes**: 42 with Cache Components enabled, 42 omitted, eight in development.
  Zero retries, skips, flakes or unexpected browser/network errors. No audit exemption was added.
- Council closure reports no issues. Claude UX and defensive-security reviews both PASS;
  valid findings were fixed red-first, including the concurrent-login cleanup wording.
- Ordinary npm-installed manual desktop/mobile proof covers decoded images, cached candidate
  reuse, accessible failure and Fast Refresh recovery with the same server PID. It uses owned
  localhost contract fakes, not a new API2/Console signup canary or production Bunny measurement.

The dev tiny-box test initially rewrote streamed HTML, inducing a WebKit reload/font cancellation.
It now changes only CSS, asserts native resize observation and preserved hydrated state; initial
pre-layout scheduling remains unit-tested. Failed attempts and the final green receipts are
retained in `/tmp/img-task2-round9-report.md`, alongside `/tmp/img-r9-evidence-OWBFjJ/`.
One preexisting lint warning and Node unit skip remain. Own services are stopped and the worktree
is clean. The incoming **6m13** signup result remains the earlier reader's measurement.

No merge/publication, dependency/schema/Built-in/auth-scope changes, API2/Content edits, env-file
edits or production changes in round 9. `@transloadit/img` is still private at 0.0.0.

### Round 9 follow-up — response-read ownership

Completed on `8c39cded80ef638cde7f05db0b509fd2abab8540`. The reported
`response.body: Test ended.` was a spec lifecycle race: the reads-array snapshot could miss
later work. Response listeners now return their async work to Playwright; main and probe
cleanup remove/drain those listeners before page/context closure. No product code, retry,
timeout or browser-error exemption changed.

- Red-first native regression holds the audit body read while the browser decodes normally.
  Both engines fail on the old handler; both wait correctly after the fix.
- Focused council: no issues found. Full `yarn check`, then sequential img check → verify →
  packed fixture pass on this head (263 img, 560 Node plus the existing unit skip).
- [Exact-head CI](https://github.com/transloadit/node-sdk/actions/runs/34801987887) is green on
  attempt 1. Independently audited local and downloaded CI artifacts confirm **96 native
  first-attempt passes**: 44 enabled, 44 omitted and eight development; no retries, skips,
  flakes or unexpected errors.
- Evidence: `/tmp/img-task2-round9-report.md`. The earlier 92-case receipts above remain
  attributed to their original head. No merge or publication.

## Round 10 — final reader residuals

Completed on `2befc537b3736617ed28080b80891c40731c8a49`. Development diagnostics now name
the actual probed origin/path, without query values or credentials. Generic HTTP failures and
unreachable hosts get distinct wording and the `baseUrl/urlParams` factory hint; publication,
auth and 404 advice, background timing and production silence remain unchanged.

The six requested README clarifications cover the workspace-derived CDN host, saved login API
endpoint, separate credential file, Console Credentials path, optional `src/` layout and supplying
a JPEG. Council's sole P3 clarified that the credential-file override belongs in the shell;
fixed red-first. README stays at 180 lines, Quickstart at 36. No other product work.

- Seven diagnostic regressions fail before the fix; the affected suites pass afterward.
  Real loopback HTTP 400 and closed-port probes verify the URL, distinct advice and redaction.
- Full `yarn check`, then sequential img check → verify → packed consumer fixture pass:
  264 img tests, 560 Node tests plus the existing skip, and root/utils/schema/relay/MCP checks.
- [Exact-head CI](https://github.com/transloadit/node-sdk/actions/runs/34803447265) is green on
  attempt 1. Independent local and downloaded artifact audits confirm **96 native first-attempt
  passes** (44 enabled, 44 omitted, 8 development), with no retries, skips, flakes or unexpected
  errors. Browser assertions and network exemptions were not changed.
- Report: `/tmp/img-task2-round10-report.md`. The incoming **4m58** signup result remains the
  independent reader's measurement on 3b26679/API2 b2264e1767/Content 40210c67f1, not this head.

Stop after this round. No new reader round, merge, publication, production requests,
API2/Content edits or environment changes; `@transloadit/img` remains private at 0.0.0.
