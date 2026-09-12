# `@transloadit/img`

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
Start with an opaque JPEG or PNG. The current preview Built-in does not promise alpha preservation.

### Install the local packages

From this SDK checkout, install its locked dependencies and pack the local artifacts:

```bash
corepack yarn install --immutable
corepack yarn workspace @transloadit/img pack --out /tmp/transloadit-img.tgz
corepack yarn workspace @transloadit/node pack --out /tmp/transloadit-node.tgz
corepack yarn workspace @transloadit/types pack --out /tmp/transloadit-types.tgz
corepack yarn workspace @transloadit/utils pack --out /tmp/transloadit-utils.tgz
```

Then, from your Next.js app, install those tarballs. Include local `utils` so the app exercises the
same signing code as the SDK checkout:

```bash
corepack yarn add @transloadit/img@file:/tmp/transloadit-img.tgz @transloadit/node@file:/tmp/transloadit-node.tgz @transloadit/utils@file:/tmp/transloadit-utils.tgz
corepack yarn add -D @transloadit/types@file:/tmp/transloadit-types.tgz
```

The Assembly client and instruction types are only needed by the seed script; `@transloadit/img`
does not add them to the browser or require an Assembly for each render.

### Configure the two key purposes

Use credentials from the **same workspace**, in server-only environment configuration such as an
untracked `.env.local`:

- `TRANSLOADIT_ASSEMBLY_KEY` and `TRANSLOADIT_ASSEMBLY_SECRET`: an **Assembly Auth Key** and its
  secret, used to sign the one-time upload/store Assembly.
- `TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET`: a **Smart CDN Auth Key** and its
  secret, used to sign delivery URLs. An Assembly-only key cannot replace this key.
- `TRANSLOADIT_WORKSPACE`: that workspace's URL slug.

Do not use a `NEXT_PUBLIC_` prefix or commit credentials. The rendering application only needs
the Smart CDN credentials; keep the write-capable Assembly credentials in the seeding environment.

### Store one image and keep its verified metadata

Save this as `seed.ts` in the app. `createAssembly()` signs with the Assembly secret. The `stored`
export step annotates its input: the receipt is in **`results[':original']`**, not `results.stored`.
This recipe checks completion, a typed `asset_id`, the returned path, byte count, MD5, and positive
image dimensions against the uploaded file. Those fields were verified in a real Storage canary.

```ts
import type { InterpolatableRobotTransloaditStoreInstructions } from '@transloadit/types/robots'

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { Transloadit } from '@transloadit/node'

/** An application-owned record saved once after upload, not fetched during rendering. */
export interface StoredImageReceipt {
  asset_id: string
  height: number
  md5hash: string
  path: string
  size: number
  width: number
}

/** Seed one image with an Assembly key and verify its returned Storage receipt. */
export async function seedStorageImage(
  client: Transloadit,
  filePath: string,
): Promise<StoredImageReceipt> {
  const bytes = await readFile(filePath)
  const expectedMd5 = createHash('md5').update(bytes).digest('hex')
  const stored = {
    conflict_strategy: 'error',
    path: 'website/${file.url_name}',
    robot: '/transloadit/store',
    use: ':original',
  } satisfies InterpolatableRobotTransloaditStoreInstructions
  const assembly = await client.createAssembly({
    files: { photo: filePath },
    params: { steps: { stored } },
    waitForCompletion: true,
  })
  const result = assembly.results?.[':original']?.[0]
  const width = result?.meta?.width
  const height = result?.meta?.height
  if (
    assembly.ok !== 'ASSEMBLY_COMPLETED' ||
    typeof result?.asset_id !== 'string' ||
    result.asset_id === '' ||
    typeof result.path !== 'string' ||
    !result.path.startsWith('website/') ||
    result.size !== bytes.length ||
    bytes.length === 0 ||
    result.md5hash !== expectedMd5 ||
    typeof width !== 'number' ||
    !Number.isSafeInteger(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(height) ||
    height <= 0
  ) {
    throw new Error('The Assembly did not return a matching Storage image receipt')
  }
  return {
    asset_id: result.asset_id,
    height,
    md5hash: result.md5hash,
    path: result.path,
    size: result.size,
    width,
  }
}

async function main(): Promise<void> {
  const authKey = process.env.TRANSLOADIT_ASSEMBLY_KEY
  const authSecret = process.env.TRANSLOADIT_ASSEMBLY_SECRET
  const filePath = process.argv[2]
  if (!authKey || !authSecret || !filePath) {
    throw new Error('Provide an Assembly key/secret and run: node seed.ts ./image.jpg')
  }
  const client = new Transloadit({
    authKey,
    authSecret,
    endpoint: process.env.TRANSLOADIT_ASSEMBLY_ENDPOINT,
  })
  console.log(JSON.stringify(await seedStorageImage(client, filePath), null, 2))
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
node --env-file=.env.local seed.ts ./canal-house.jpg > image.json
```

Proceed only when the command exits successfully. `conflict_strategy: 'error'` makes a repeated
upload to the same path fail rather than silently replacing an asset. Choose a different filename
or an intentional conflict policy for another upload. This small recipe reads the image into
memory to verify its checksum; it is not a bulk-ingestion tool.

The resulting JSON contains `asset_id`, `path`, `size`, `md5hash`, `width`, and `height`. Keep it
alongside your content or in your application's database; rendering needs no metadata request.
The `asset_id` identifies the stored asset, while the returned `path` is the component's `src`.
Only the dimensions and path need to enter image markup.

### Render the stored image

Create the server-only `lib/transloaditImage.tsx` module shown below, then use the saved record
(this example keeps `image.json` in the app root):

```tsx
import image from '../image.json'
import { Image } from '../lib/transloaditImage.tsx'

export default function Page() {
  return (
    <Image
      alt="A canal house"
      height={image.height}
      sizes="(min-width: 960px) 960px, 100vw"
      src={image.path}
      style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
      width={image.width}
    />
  )
}
```

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

The server entry point targets the Next.js 16 App Router with `cacheComponents: true` in
`next.config.ts`.

Create one server-only application module. The factory does not read environment variables:

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
image that has no source and makes no request. `suspenseFallback` explicitly replaces that shell
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

Export the handler from that exact App Router path:

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

The fixture packs the image, SDK, instruction-type, and signing artifacts and installs them into a
clean Next.js 16 App Router app. It executes this exact seed recipe against mocked Assembly receipts
without network access, compiles it against the packed SDK/types, builds partially prerendered and
dynamic routes, starts the production server, probes route
authorization and capability tampering, checks for secret leakage, and reports direct-versus-
redirect HTML size and route work for 1, 20, and 100 images. Size measurements are deterministic;
wall-clock measurements are diagnostic and do not create flaky CI thresholds.
