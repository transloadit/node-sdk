# `@transloadit/img`

Responsive previews of Transloadit Storage objects, delivered through Smart CDN.

The package renders native `<picture>`, `srcset`, and `<img>` elements. Image bytes travel directly
from Smart CDN to the browser; they are never optimized or proxied by the Next.js application.
Remote HTTP URLs are deliberately outside this package's source contract: an image must already
belong to the configured Transloadit Storage workspace.

This workspace remains private at version `0.0.0` while the API and production dogfood soak. Do not
depend on it from npm yet.

## Seed your first image

This walkthrough uses Node.js 24.11 or newer and an existing Next.js 16 App Router app with
Yarn 4's `node-modules` linker (`nodeLinker: node-modules`). The
workspace must have Transloadit Storage writes enabled; package installation does not enable them.
Start with an opaque JPEG or PNG. The current preview Built-in does not promise alpha preservation.

The server entry point needs the **Node.js runtime**, not Edge: it uses `node:crypto` and `Buffer`.
The examples use root `app/` and `lib/` directories; adjust their relative imports for `src/app/`.
For the shown `.ts`/`.tsx` imports, enable `allowImportingTsExtensions` and `noEmit` in your app's
`tsconfig.json`; enable `resolveJsonModule` for the saved receipt. See the
[TypeScript import-extension reference](https://www.typescriptlang.org/tsconfig/allowImportingTsExtensions.html).
Keep your app's Node/React type dependencies; with TypeScript 6, include `node` in
`compilerOptions.types` when checking the seed outside Next's generated environment declarations.

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

In the same terminal, switch to your Next.js app. Merge this field into its root `package.json`,
replacing `/ABSOLUTE_PACK_DIR` with the directory just printed:

```json
{
  "resolutions": {
    "@transloadit/utils": "file:/ABSOLUTE_PACK_DIR/transloadit-utils.tgz"
  }
}
```

This [Yarn resolution](https://yarnpkg.com/configuration/manifest#resolutions) makes img and the
seed client use the reviewed local signing package. Adding a root `file:` dependency alone can
leave a second registry copy nested under img. Then install the four tarballs:

```bash
corepack yarn add "@transloadit/img@file:$img_pack_dir/transloadit-img.tgz" "@transloadit/utils@file:$img_pack_dir/transloadit-utils.tgz"
corepack yarn add -D "@transloadit/node@file:$img_pack_dir/transloadit-node.tgz" "@transloadit/types@file:$img_pack_dir/transloadit-types.tgz"
```

The Assembly client is a seed-only development dependency. The optional instruction types are used
by the packed recipe's tests and by advanced `createAssembly()` calls, not the seed helper. Utils is a real
runtime dependency of img; the local tarball override is specific to this unpublished walkthrough.
Img does not add the Assembly client to the browser or create an Assembly for each render. Keep
the tarballs available for reinstalls; do not commit machine-specific paths as a production setup.

### Configure the two key purposes

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

```bash
node --env-file=.env.seed.local seed.ts ./canal-house.jpg website/canal-house.jpg > image.json
```

The helper requires the full filename, not a directory or an interpolation expression. Advanced
`createAssembly()` instructions can use the single-quoted `'website/${file.url_name}'` literal:
Transloadit, not JavaScript, substitutes the input's URL-safe filename in that expression. Node 24 detects
ES module syntax when `package.json` has no `type`; explicit `"type": "commonjs"` is different.
For this native TypeScript seed, use `"type": "module"` in the app's package manifest. No tsx or
ts-node runner is needed. See [Node's module detection](https://nodejs.org/download/release/v24.11.0/docs/api/packages.html#syntax-detection).

Proceed only when the command exits successfully. `conflict_strategy: 'error'` makes a repeated
upload to the same path fail rather than silently replacing an asset. Choose a different filename
or use `createAssembly()` for an intentional conflict policy. Do not modify the input file while
it is being checksummed and uploaded. Receipt validation happens **after the Storage write**:
a validation error is not a rollback, and retrying the same path can encounter the stored object.
An `InconsistentResponseError` retains `cause.assemblyId` for investigation without copying the
Assembly response. Existing API, timeout and cancellation errors propagate unchanged.

The helper also accepts `signal`, `chunkSize`, `onUploadProgress`, `onAssemblyProgress` and the
existing Assembly `timeout` (upload/polling, not local checksum time). It never accepts replacement
steps or enables overwrite. Use `createAssembly()` for multi-file or transformation workflows.

The resulting JSON contains `asset_id`, `path`, `size`, `md5hash`, `width`, and `height`. Keep it
alongside your content or in your application's database; rendering needs no metadata request.
The `asset_id` identifies the stored asset. Pass the whole receipt as `src`; only its `path`,
`width` and `height` are used. No receipt ID, checksum or other ancillary fields enter markup or
signing, and the rendering package does not import the Assembly client.

### Create the server-only factory

Save this complete module as `lib/transloaditImage.tsx`. The explicit factory does not read env
files or variables itself; the application passes its rendering credentials and allowed paths:

```tsx
import { createTransloaditImage } from '@transloadit/img/next/server'

const authKey = process.env.TRANSLOADIT_SMART_CDN_KEY
const authSecret = process.env.TRANSLOADIT_SMART_CDN_SECRET
const workspace = process.env.TRANSLOADIT_WORKSPACE

if (!authKey || !authSecret || !workspace) {
  throw new Error('Transloadit image credentials are required')
}

export const { Image } = createTransloaditImage({
  authKey,
  authSecret,
  storage: { allowedPathPrefixes: ['website/'] },
  workspace,
})
```

The Auth Secret stays in the server module and never enters rendered markup or a client bundle.
Signed browser URLs contain the public Auth Key identifier, as required by Smart CDN verification.

### Render the stored image

Use that factory and the saved record in `app/page.tsx` (with `image.json` in the app root):

```tsx
import image from '../image.json'
import { Image } from '../lib/transloaditImage.tsx'

export default function Page() {
  return (
    <Image
      alt="A canal house"
      sizes="(min-width: 960px) 960px, 100vw"
      src={image}
      style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
    />
  )
}
```

Object `src` accepts the readonly structural `TransloaditImageSource` shape: `{ path, width, height }`.
Saved JSON and SDK receipts both work; separate `width`/`height` props are forbidden with object
input. The string form remains available with both dimensions required. The same rules apply to
direct delivery, redirect delivery and the framework-neutral model.

The dimensions come from the receipt, not the display box. The CSS preserves those proportions
and caps the displayed width at 960px. This uses direct delivery; choose the authorized-redirect
configuration below instead if the page may outlive a signature.

### Direct devdock origin

For a local devdock seed only, set `TRANSLOADIT_ASSEMBLY_ENDPOINT` to your trusted Assembly API
endpoint. This is separate from the Smart CDN origin. For direct devdock image delivery, configure
the image factory with the trusted URL Transform `baseUrl` (including its `{workspace}` placeholder)
and `urlParams: { cdn: 'required' }`. This supplies API2's explicit `cdn: required` acknowledgment
because native image requests cannot attach a custom header. It does **not** install a CDN or
bypass signatures. Keep the Smart CDN key and secret, and never take either override from a request.
Normal Smart CDN delivery needs neither local override.

## Next.js

The production fixture tests Next.js **16.3.0** with React **19.2.8**, with `cacheComponents: true`
in `next.config.ts` **and with that option omitted**. Cache Components is not required: direct
delivery remains request-rendered via `connection()` in either mode. With Cache Components on,
the direct image also gets a safe partial-prerender shell. The native browser suite exercises
Chromium and WebKit against both production configurations.

Use a relative Storage object path as `src` and provide the source's intrinsic dimensions:

```tsx
import { Image } from '../lib/transloaditImage.tsx'

export default function Page() {
  return (
    <Image
      alt="A canal house"
      height={1600}
      sizes="(min-width: 960px) 960px, 100vw"
      src="website/canal-house.jpg"
      style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
      width={2400}
    />
  )
}
```

The 2400×1600 dimensions describe the source, not a 2400px display box. The CSS caps the hero at
960px, preserves its 3:2 aspect ratio, and lets it shrink with its container. `sizes` describes
that layout to the browser; it does not set CSS dimensions. Adjust it if your page has gutters or
a narrower container.

For a 400×400 avatar source displayed in a 48px box, limit the candidates to 1× and 2×:

```tsx
<Image
  alt="Your profile photo"
  height={400}
  objectFit="cover"
  sizes="48px"
  src="website/avatar.jpg"
  style={{ display: 'block', height: 48, width: 48 }}
  width={400}
  widths={[48, 96]}
/>
```

This limits the modern source candidates, not the JPEG fallback: the fallback still uses the
capped intrinsic source width, **400px for this avatar**, even with `widths={[48, 96]}`.

`storage.allowedPathPrefixes` is a hard workspace boundary, not object authorization. Prefixes must
be relative directories ending in `/`. The default is deny-all; `['']` deliberately allows the
workspace root. Paths with dot segments, backslashes, empty segments, control characters,
non-normalized Unicode, or more than 1024 UTF-8 bytes are rejected before signing.

### Direct delivery

Choose the delivery policy based on the page's lifetime: use authorized redirects for cached
markup and pages that may outlive a CDN signature. Use direct delivery for request-authorized
galleries that do not need a new application authorization check when each image loads.

Direct delivery is the default and fits image-heavy views that already authorize their data while
rendering. The component calls Next.js `connection()` before creating short-lived signed URLs. A
built-in Suspense boundary lets a Cache Components page prerender a shell, but the signed image
itself is request-rendered and must not be stored in a shared full-page cache.
By default the shell reserves the image's dimensions and layout styles with an inert, invisible
image that has no source and makes no request. IDs and ARIA relationships belong only to the
resolved image, not its decorative shell. `suspenseFallback` explicitly replaces that shell
(including `null` to omit it); custom fallbacks must reserve their own space.

The browser requests the selected candidate directly from Smart CDN. Lazy loading remains the
platform default. A candidate first requested after its signature expires can fail on an unusually
long-lived page. Prefer authorized redirects for that case; a longer direct signature only delays
the boundary and also extends the lifetime of a URL that has already been issued.

### Authorized redirects

Redirect delivery keeps markup stable and rechecks application access when the browser loads an
image:

```tsx
import { createTransloaditImage } from '@transloadit/img/next/server'

export const { Image, storageRoute } = createTransloaditImage({
  authKey,
  authSecret,
  storage: {
    allowedPathPrefixes: ['documents/'],
    delivery: {
      authorize: async ({ path, request }) => {
        const user = await authenticate(request)
        return user !== null && (await canReadStorageObject(user, path))
      },
      // Match next.config.ts when the application uses basePath.
      basePath: '/app',
      route: '/api/private-images',
    },
    expiresInMs: 5 * 60 * 1000,
    rotationIntervalMs: 30 * 1000,
  },
  workspace,
})
```

Export the handler from **`app/api/private-images/route.ts`** (or
`src/app/api/private-images/route.ts` with a `src/lib/` factory). `basePath: '/app'` only changes
the browser URL to `/app/api/private-images`; it does not add another filesystem directory:

```ts
export { storageRoute as GET } from '../../../lib/transloaditImage.tsx'
```

The component emits same-origin URLs containing an authenticated-encrypted capability for one
exact Storage path and transformation. Filenames and credentials stay out of prerendered HTML.
The handler rejects changed, duplicate, unknown, oversized, or malformed capabilities before
calling application authorization. `authorize` must return the boolean `true` for the current
request.

Use browser-attached credentials, normally your same-origin session cookie, in `authenticate`.
Native image requests cannot attach an application-defined Bearer header.

After authorization, the handler returns a private, non-cacheable `307` to a fresh signed Smart CDN
URL. Image bytes still bypass Next.js. Rotating the Transloadit secret invalidates existing
capabilities, so redeploy cached static markup at the same time.

The example issues CDN grants valid for at least five minutes and at most five minutes thirty
seconds, including the rotation window. These are explicit example settings, not new defaults;
allow enough time for a cold transformation. Cached capabilities can still request a new grant
after an earlier CDN URL has expired, provided application authorization continues to allow access.

Revoking application access denies **new redirect grants**. It does not invalidate signed CDN URLs
already handed to a browser: those remain valid until their expiry. Downloaded bytes cannot be
recalled. Shorter grants bound this remaining access window; they do not provide instant revocation.

A 403/404 is a native image-load failure: depending on the browser, users may see alt text or a
broken-image indicator. The package adds no error UI or callback. Suspense handles pending
server-side signing, not later image-download failures, and the JPEG fallback is format selection,
not automatic recovery from a failed AVIF/WebP HTTP request.

| Property | Direct, the default | Authorized redirect |
| --- | --- | --- |
| Next.js work per loaded image | None | One authorization + redirect |
| Image bytes through Next.js | Never | Never |
| Shared/static image markup | No | Yes |
| Application checks for new image grants | During page rendering | On each redirect request |
| Already-issued CDN URLs | Valid until expiry | Valid until expiry |
| Long-lived lazy pages | Signature can expire | Fresh CDN signature per load |
| Typical fit | Request-authorized galleries | Cached markup and long-lived private pages |

## Responsive policy

Storage previews use signed-only `builtin/storage-preview@0.0.1`. AVIF quality 45 and WebP quality
75 are emitted in browser preference order, with a JPEG quality 75 fallback. Explicit formats keep
CDN objects independent from an unkeyed `Accept` header.

The default candidate ladder is 320, 640, 960, 1280, 1920, 2560, and 3840 pixels, capped at the
declared intrinsic width and backend-safe height. The exact intrinsic width is included between
steps. `widths` is an advanced per-image override. Omitted `sizes` emits explicit `100vw` on the
width-based sources. Supply the actual display width when it differs, or use `sizes="auto, 100vw"`
for a lazy image whose size should come from its CSS box. Automatic sizes cannot be eager or preloaded.

```tsx
<Image
  alt="Product photo"
  formats={{ avif: 40, webp: 70 }}
  height={1200}
  sizes="(min-width: 1200px) 600px, 50vw"
  src="website/products/photo.jpg"
  style={{ display: 'block', height: 'auto', maxWidth: 600, width: '50vw' }}
  width={1600}
  widths={[400, 800, 1200, 1600]}
/>
```

- Images are lazy and asynchronously decoded by default.
- `preload` implies eager loading. Combine it with `fetchPriority="high"` only for a measured LCP
  image. Explicitly lazy preloads are rejected.
- Keep `width`/`height` in the source's proportions. Transforms use `r: 'pad'`; CSS `objectFit`
  controls cropping in a display box but cannot undo padding already encoded in the image.
- `fallbackQuality` changes the signed JPEG fallback quality.

The preview Built-in owns padding and its background. Its resize default is **white**, and integer
candidate heights are rounded from the source ratio. Proportional sizing minimizes padding but
does not promise absent bars, pixel-exact ratios at every candidate width, or alpha preservation.

For a full-cover box, `sizes` may need to exceed `100vw`. With source dimensions `Ws × Hs` and
a rendered box `Wb × Hb`, cover scaling needs an equivalent uncropped CSS width of
`max(Wb, Hb * Ws / Hs)`. Describe that width in `sizes` (divide by viewport width and multiply by
100 for `vw`), at each relevant breakpoint; the browser applies device pixel ratio itself. The
Content construction hero needed **382vw** on small screens because the tall box cropped a wide
source. Source dimensions alone cannot determine a container's layout or this cover requirement.

Private signature lifetimes default to at least one hour in stable five-minute rotation windows.
Their sum cannot exceed 48 hours:

```tsx
storage: {
  allowedPathPrefixes: ['documents/'],
  expiresInMs: 2 * 60 * 60 * 1000,
  rotationIntervalMs: 5 * 60 * 1000,
}
```

## Template override

A compatible workspace Template can replace the Built-in in trusted factory configuration:

```tsx
export const { Image } = createTransloaditImage({
  authKey,
  authSecret,
  storage: { allowedPathPrefixes: ['website/'] },
  template: 'my-storage-preview',
  workspace,
})
```

Template selection is unavailable on individual images because the factory owns the signing
boundary. A replacement must accept the same trusted fields as the Storage preview Built-in.

### Opt-in hydration workaround

`deferUntilHydrated` avoids WebKit parser-to-hydration request replay for non-critical images.
Leave it off unless you have observed that problem: it delays candidate markup until hydration,
and its initial `<noscript>` fallback does not reserve space for JavaScript-enabled browsers.
It cannot be eager or preloaded and is not a secrecy mechanism.

## Framework-neutral API

`@transloadit/img` exports `createTransloaditImageModel` and serializable model types.
`@transloadit/img/next` renders an already-resolved model. These lower-level entry points let other
framework adapters inject a server-side URL resolver while credential and authorization policy stay
outside the renderer.

## Verification

```console
corepack yarn workspace @transloadit/img check
corepack yarn test:img:fixture
```

The fixture packs all four local artifacts and installs them with its pinned **npm** lockfile into
a clean Next.js app. It executes this exact seed recipe against mocked Assembly receipts without
network access and compiles it against the packed SDK/types. It builds and serves both production
Cache Components configurations, then runs 36 Chromium/WebKit cases: native cookie authorization,
separate app/CDN hosts, responsive hero/avatar geometry, private-redirect decoding before application JavaScript,
hydration, JPEG fallback, original-capability renewal, revocation, expiry and tampering. Chromium
also verifies direct streaming before application JavaScript; direct WebKit navigation uses normal
script loading because holding bundles can stall React's streaming reveal in the test browser.
That extra WebKit pre-JS scenario remains unverified. The owned
local image origin independently verifies signatures/expiry and serves real encoded bytes; it
never receives the application's session cookie. Secret scans cover the rendered/client artifacts.

The test records browser evidence and direct-versus-redirect HTML size and route work for 1, 20,
and 100 images. Wall-clock measurements are diagnostic, not CI performance thresholds. This local
proof does not measure production CDN latency/caching or alpha preservation. The npm fixture is
not proof of the exact Yarn commands above; those are also verified separately in a clean Yarn
consumer, including the local utils resolution.
