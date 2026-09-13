# `@transloadit/img` local dogfood and verification

These are maintainer-only packing, SDK seed and devdock notes, not consumer prerequisites.
Use the [package README](../packages/img/README.md) for the application integration.

Responsive previews of Transloadit Storage objects, delivered through Smart CDN.

The package renders native `<picture>`, `srcset`, and `<img>` elements. Image bytes travel directly
from Smart CDN to the browser; they are never optimized or proxied by the Next.js application.
Remote HTTP URLs are deliberately outside this package's source contract: an image must already
belong to the configured Transloadit Storage workspace.

This workspace remains private at version `0.0.0` while the API and production dogfood soak. Do not
depend on it from npm yet.

## Seed your first image

This walkthrough uses Node.js 24.11 or newer and an existing Next.js 16 App Router app. The
workspace must have Transloadit Storage writes enabled; package installation does not enable them.
The backend must provide `builtin/storage-preview@0.0.2` for this package revision: use API2
#9057 at `07ec5abc2b71d449a7474391c8eeef4934ef3589` or newer in an owned devdock until that PR is
deployed. Version 0.0.1 stays unchanged and flattens transparency; 0.0.2 accepts the signed `bg`
field needed by alpha-preserving candidates and the opaque JPEG fallback.

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
prerequisite for `auth login`, `storage store` or `image init`.

### Advanced alternative: configure a standalone seed script

Skip this section when using `auth login` and `storage store`; those commands already seed the image.

Use credentials from the **same workspace**, but separate write access from rendering. Add both
`.env.seed.local` and `.env.local` to the app's `.gitignore` before creating them:

- `TRANSLOADIT_ASSEMBLY_KEY` and `TRANSLOADIT_ASSEMBLY_SECRET`: an **Assembly Auth Key** and its
  secret, used to sign the one-time upload/store Assembly. Put these in **`.env.seed.local`**,
  loaded only by the seed command below.
- `TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET`: a **Smart CDN Auth Key** and its
  secret, used to sign delivery URLs. Put these in **`.env.local`** for Next.js. An Assembly-only
  key cannot replace this key.
- `TRANSLOADIT_WORKSPACE`: put the workspace's URL slug in `.env.local` too. In a Console URL such
  as `/c/my-workspace/`, the slug is `my-workspace`, not a key or workspace ID.

Do not use a `NEXT_PUBLIC_` prefix or commit credentials. The rendering application only needs
the Smart CDN credentials. Next.js loads `.env.local`, so it is **not** an isolated place for the
write-capable Assembly credentials. `.env.seed.local` is outside Next's normal env-file names.

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
The `asset_id` identifies the stored asset. Pass the whole receipt as `src`; only its `path`,
`width` and `height` are used. No receipt ID, checksum or other ancillary fields enter markup or
signing, and the rendering package does not import the Assembly client.

### Direct devdock origin

For a local devdock seed only, set `TRANSLOADIT_ASSEMBLY_ENDPOINT` to your trusted Assembly API
endpoint. This is separate from the Smart CDN origin. For direct devdock image delivery, configure
the image factory with the trusted URL Transform `baseUrl` (including its `{workspace}` placeholder)
and `urlParams: { cdn: 'required' }`. This supplies API2's explicit `cdn: required` acknowledgment
because native image requests cannot attach a custom header. It does **not** install a CDN or
bypass signatures. Keep the Smart CDN key and secret, and never take either override from a request.
Normal Smart CDN delivery needs neither local override.
`createStorageImages` accepts these same `baseUrl` and `urlParams` fields directly,
alongside `allowedPathPrefixes` and `authorize`.

The factory exports `StorageImage`. Round 5 uses one flat `createStorageImages({ images, public })`
shape for the public Content hero, with catalog-typed src and fill/cover breakpoint ratios.
Public direct markup is static; private direct images remain request-rendered. See the package
README for layout and authorization policy; this document only covers maintainer setup.

Before publication, a Yarn consumer may resolve a registry copy of `@transloadit/utils` under
the image package even when the new utilities tarball is a direct dependency. For local dogfood,
explicitly resolve that dependency to the same packed utilities. The release must bump utilities
and the dependent minimum versions together; publishing img against the old minimum is unsafe.

### Live Storage listing and rendering receipt recovery

The owned clone17 canary now runs API2 `07ec5abc2b71d449a7474391c8eeef4934ef3589`. Only that internal-only, port-free devdock's
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
Cache Components configurations, then runs 64 Chromium/WebKit cases (16 cases × 2 engines ×
2 configurations): native cookie authorization,
GET/HEAD parity, explicit public-prefix caching, responsive art direction with real cropped bytes,
separate app/CDN hosts, constrained hero/fixed avatar geometry, portrait fillcrop, optional error
fallback and same-page sign-in/refresh recovery, the actual CLI-generated constrained public page
without a CSS reset, private-redirect decoding before application JavaScript, hydration, bounded JPEG fallback,
original-capability renewal, revocation, expiry and tampering. Chromium
also verifies direct streaming before application JavaScript; direct WebKit navigation uses normal
script loading because holding bundles can stall React's streaming reveal in the test browser.
That extra WebKit pre-JS scenario remains unverified. The owned
local image origin independently verifies signatures/expiry and serves real encoded bytes; it
never receives the application's session cookie. Transparent AVIF/WebP/PNG corners and the signed
opaque JPEG background are checked at the pixel level. This origin emulates the Built-in contract;
it does not execute API2's transformation pipeline. Secret scans cover rendered/client artifacts.

The test records browser evidence and direct-versus-redirect HTML size and route work for 1, 20,
and 100 images. Wall-clock measurements are diagnostic, not CI performance thresholds. This local
proof does not measure production CDN latency/caching or prove the deployed API2 pipeline.
The fixture checks the packed dependency graph independently of the own-devdock consumer test.
