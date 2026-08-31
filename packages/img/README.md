# `@transloadit/img`

Responsive images powered by Transloadit Smart CDN, with one Next.js Server Component for public
URLs and private Transloadit Storage objects.

The package renders native `<picture>`, `srcset`, and `<img>` elements. Image bytes travel directly
from Smart CDN to the browser; they are never optimized or proxied by the Next.js application.

This workspace remains private at version `0.0.0` while the API and production dogfood soak. Do not
depend on it from npm yet.

## Next.js

The server entry point targets the Next.js 16 App Router with `cacheComponents: true` in
`next.config.ts`.

Create one server-only application module. The factory does not read environment variables:

```tsx
import { createTransloaditImage } from '@transloadit/img/next/server'

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
const workspace = process.env.TRANSLOADIT_WORKSPACE

if (!authKey || !authSecret || !workspace) {
  throw new Error('Transloadit image credentials are required')
}

export const { Image } = createTransloaditImage({
  authKey,
  authSecret,
  public: { allowedOrigins: ['https://assets.example'] },
  storage: { allowedPathPrefixes: ['documents/'] },
  workspace,
})
```

The Auth Secret stays in the server module and never enters rendered markup or a client bundle.
Signed browser URLs contain the public Auth Key identifier, as required by Smart CDN verification.

### Public URL

Use the same intrinsic `width` and `height` contract as an HTML image:

```tsx
import { Image } from '../lib/transloaditImage.tsx'

export default function Page() {
  return (
    <Image
      alt="A canal house"
      height={1600}
      sizes="(min-width: 1024px) 960px, 100vw"
      src="https://assets.example/canal-house.jpg"
      width={2400}
    />
  )
}
```

Public inputs render statically. Their signed URLs have a minimum one-year lifetime by default.
Expiry rotates in coarse buckets of at most one day, so a long-lived server factory cannot emit an
already-expired URL and repeated renders within a bucket remain cache-friendly. A small Next.js
`use cache` boundary gives server deployments an expiry-aware revalidation window while preserving
static output; fully static exports must still be redeployed before their embedded URLs expire. Set
a different factory-wide minimum lifetime when needed:

```tsx
export const { Image } = createTransloaditImage({
  authKey,
  authSecret,
  public: {
    allowedOrigins: ['https://assets.example'],
    expiresInMs: 90 * 24 * 60 * 60 * 1000,
  },
  workspace,
})
```

The configured minimum must be at least one minute.

Every source must be a public HTTP(S) URL without credentials, a query string, or a fragment. Its
exact origin, including scheme and any non-default port, must occur in `public.allowedOrigins`.
The default is deny-all. An HTTPS origin does not authorize HTTP.

`fallbackSrc` can provide an application-owned browser fallback. It defaults to the original source
URL and is never sent through Smart CDN.

### Private Storage: direct delivery

Direct delivery is the default and is best for image-heavy views that already authorize their data
while rendering:

```tsx
<Image
  alt="Preview of report.pdf"
  height={900}
  sizes="(min-width: 768px) 400px, 100vw"
  src={{ storage: 'documents/report.pdf' }}
  width={1200}
/>
```

The component calls Next.js `connection()` before creating short-lived signed URLs. A built-in
Suspense boundary allows a Cache Components page to prerender a shell, but the signed image itself
is request-rendered and must not be stored in a shared full-page cache. `suspenseFallback` customizes
that shell.

The browser requests the selected candidate directly from Smart CDN. Lazy loading remains the
platform default. A candidate first requested after its signature expires can fail on an unusually
long-lived page; choose an appropriate bounded `expiresInMs`, opt into eager loading for a small
critical set, or use authorized redirect delivery below when long-lived markup matters.

### Private Storage: authorized redirects

Redirect delivery keeps markup stable and rechecks application access when the browser actually
loads an image. Configure a route and an authorization callback:

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
      // Set this to the same value as next.config.ts when the application uses one.
      basePath: '/app',
      route: '/api/private-images',
    },
  },
  workspace,
})
```

Export the handler from that exact App Router path:

```ts
export { storageRoute as GET } from '../../../lib/transloaditImage.tsx'
```

`route` is the internal App Router path. Set `basePath` separately when Next.js exposes that route
under a prefix; the handler accepts both the external and Next-stripped pathname. Include a trailing
slash in `route` when `trailingSlash: true` should avoid Next's normalization redirect.

The component now emits same-origin route URLs and can be included in statically rendered or shared
cached markup. Each URL carries one authenticated-encrypted capability for an exact Storage path and
transformation, so private filenames and tenant identifiers stay out of HTML and the application
route URL before authorization. The authorized Smart CDN redirect still contains the Storage path;
it is visible to the browser and CDN, as it is with direct delivery. Capabilities use deterministic
AES-256-GCM-SIV: equal path and transform values produce stable URLs while other information stays
hidden. The key is derived from the Transloadit secret with a package- and workspace-specific
context. The handler rejects changed, duplicate, unknown, oversized, or malformed capabilities
before invoking application authorization. A valid capability is not access by itself: `authorize`
must return the boolean `true` for the current request. Treat it as an object-level check, not merely
“is logged in,” unless every authenticated user may read every referenced object in shared markup.

After authorization the handler returns a private, non-cacheable `307` to a short-lived signed Smart
CDN URL. The selected image bytes still bypass Next.js. Rotating the Transloadit secret invalidates
old capabilities, so redeploy any cached static markup at the same time.

Choose the private delivery mode by workload:

| Property | Direct, the default | Authorized redirect |
| --- | --- | --- |
| Next.js work per loaded image | None | One authorization + redirect |
| Image bytes through Next.js | Never | Never |
| Shared/static image markup | No | Yes |
| Request-time revocation | No | Yes |
| Long-lived lazy pages | Signature can expire | Fresh CDN signature per load |
| Typical fit | Large authorized galleries | Strict ACLs and revocation |

`storage.allowedPathPrefixes` is a hard workspace boundary, not object authorization. Prefixes must
be relative directories ending in `/`; the default is deny-all and `['']` deliberately allows the
workspace root. Both delivery modes reject dot segments, backslashes, empty segments, control
characters, non-NFC paths, and paths above 1024 UTF-8 bytes.

Storage previews use signed-only `builtin/storage-preview@0.0.1`, which can preview images,
documents, video, audio, and unknown file types. `builtin/storage-serve` intentionally remains the
raw original-file delivery primitive.

## Responsive policy

AVIF quality 45 and WebP quality 75 are emitted in browser preference order, with a JPEG quality 75
fallback for Storage. Formats are explicit so CDN objects do not depend on an unkeyed `Accept`
header. `format:auto` is intentionally not used in this first contract.

The default candidate ladder is 320, 640, 960, 1280, 1920, 2560, and 3840 pixels, capped at the
declared intrinsic width and backend-safe height. The exact intrinsic width is included when it
falls between steps. `widths` is an advanced per-image override. `sizes` is optional because that is
valid HTML, but strongly recommended whenever an image is not effectively `100vw`; it lets the
browser select the smallest sufficient candidate.

```tsx
<Image
  alt="Product photo"
  formats={{ avif: 40, webp: 70 }}
  height={1200}
  sizes="(min-width: 1280px) 600px, 50vw"
  src="https://assets.example/product.jpg"
  width={1600}
  widths={[400, 800, 1200, 1600]}
/>
```

- Images are lazy and asynchronously decoded by default.
- `preload` implies eager loading. Combine it with `fetchPriority="high"` only for a measured LCP
  image. Explicitly lazy preloads are rejected.
- Public images support `media`; a media-gated preload is rejected because React 19 can collapse
  complementary responsive preload hints. Storage previews do not support `media`.
- `objectFit` is forwarded as CSS for deliberate crop or containment behavior.
- `deferUntilHydrated` avoids WebKit parser-to-hydration replay for non-critical images. It cannot be
  eager or preloaded and is not a secrecy mechanism. It serializes both deferred and fallback
  children, so measure its extra HTML/Flight payload before using it across large galleries.
- Storage accepts `fallbackQuality`; both source types accept a format-quality map.

Private signature lifetimes default to at least one hour in stable five-minute rotation windows.
Their sum cannot exceed 48 hours:

```tsx
storage: {
  allowedPathPrefixes: ['documents/'],
  expiresInMs: 2 * 60 * 60 * 1000,
  rotationIntervalMs: 5 * 60 * 1000,
}
```

## Template overrides

Compatible workspace Templates can replace either Built-in in trusted factory configuration:

```tsx
templates: {
  storage: 'my-storage-preview',
  url: 'my-serve-image',
}
```

Template selection is deliberately unavailable on individual images because the factory owns the
signing boundary. A replacement must accept the same trusted fields as its corresponding Built-in.

## Why there is no `next/image` loader yet

The current public URL integration is still signed. Merely disabling signatures on
`builtin/serve-image` would expose arbitrary origins and transformations as the customer's billing
proxy. A public loader should ship only after API2 can enforce an immutable delivery profile with
origin, path, redirect, transform, output-size, and abuse limits at the service boundary.

The longer-term private ideal is equivalent edge enforcement of an application-issued,
path-scoped token or cookie. That would preserve request-time authorization and a shared CDN cache
without one Next.js redirect per loaded image.

## Framework-neutral API

`@transloadit/img` exports `createTransloaditImageModel` and serializable model types.
`@transloadit/img/next` renders an already-resolved model. These lower-level entry points let other
framework adapters inject a server-side URL resolver while keeping credential and authorization
policy outside the renderer. `model.expiresAt` is present for fixed signed URLs and may be absent
when an adapter resolves a fresh URL after browser authorization.

## Verification

```console
corepack yarn workspace @transloadit/img check
corepack yarn test:img:fixture
```

The fixture packs the published artifacts, installs them into a clean Next.js 16 App Router app,
builds static, partially prerendered, and dynamic routes, starts the production server, probes route
authorization and capability tampering, checks for secret leakage, and reports direct-versus-
redirect HTML size and route work for 1, 20, and 100 images. Size measurements are deterministic;
wall-clock measurements are diagnostic and do not create flaky CI thresholds.
