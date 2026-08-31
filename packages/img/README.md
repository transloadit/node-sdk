# `@transloadit/img`

Responsive previews of Transloadit Storage objects, delivered through Smart CDN.

The package renders native `<picture>`, `srcset`, and `<img>` elements. Image bytes travel directly
from Smart CDN to the browser; they are never optimized or proxied by the Next.js application.
Remote HTTP URLs are deliberately outside this package's source contract: an image must already
belong to the configured Transloadit Storage workspace.

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
      sizes="(min-width: 1024px) 960px, 100vw"
      src="website/canal-house.jpg"
      width={2400}
    />
  )
}
```

`storage.allowedPathPrefixes` is a hard workspace boundary, not object authorization. Prefixes must
be relative directories ending in `/`. The default is deny-all; `['']` deliberately allows the
workspace root. Paths with dot segments, backslashes, empty segments, control characters,
non-normalized Unicode, or more than 1024 UTF-8 bytes are rejected before signing.

### Direct delivery

Direct delivery is the default and fits image-heavy views that already authorize their data while
rendering. The component calls Next.js `connection()` before creating short-lived signed URLs. A
built-in Suspense boundary lets a Cache Components page prerender a shell, but the signed image
itself is request-rendered and must not be stored in a shared full-page cache.
`suspenseFallback` customizes that shell.

The browser requests the selected candidate directly from Smart CDN. Lazy loading remains the
platform default. A candidate first requested after its signature expires can fail on an unusually
long-lived page; choose an appropriate bounded `expiresInMs`, eagerly load a measured critical
image, or use authorized redirect delivery.

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

After authorization, the handler returns a private, non-cacheable `307` to a fresh signed Smart CDN
URL. Image bytes still bypass Next.js. Rotating the Transloadit secret invalidates existing
capabilities, so redeploy cached static markup at the same time.

| Property | Direct, the default | Authorized redirect |
| --- | --- | --- |
| Next.js work per loaded image | None | One authorization + redirect |
| Image bytes through Next.js | Never | Never |
| Shared/static image markup | No | Yes |
| Request-time revocation | No | Yes |
| Long-lived lazy pages | Signature can expire | Fresh CDN signature per load |
| Typical fit | Large authorized galleries | Strict ACLs and revocation |

## Responsive policy

Storage previews use signed-only `builtin/storage-preview@0.0.1`. AVIF quality 45 and WebP quality
75 are emitted in browser preference order, with a JPEG quality 75 fallback. Explicit formats keep
CDN objects independent from an unkeyed `Accept` header.

The default candidate ladder is 320, 640, 960, 1280, 1920, 2560, and 3840 pixels, capped at the
declared intrinsic width and backend-safe height. The exact intrinsic width is included between
steps. `widths` is an advanced per-image override. `sizes` is optional because that is valid HTML,
but strongly recommended whenever an image is not effectively `100vw`.

```tsx
<Image
  alt="Product photo"
  formats={{ avif: 40, webp: 70 }}
  height={1200}
  sizes="(min-width: 1280px) 600px, 50vw"
  src="website/products/photo.jpg"
  width={1600}
  widths={[400, 800, 1200, 1600]}
/>
```

- Images are lazy and asynchronously decoded by default.
- `preload` implies eager loading. Combine it with `fetchPriority="high"` only for a measured LCP
  image. Explicitly lazy preloads are rejected.
- `objectFit` is forwarded for deliberate crop or containment behavior.
- `deferUntilHydrated` avoids WebKit parser-to-hydration replay for non-critical images. It cannot be
  eager or preloaded and is not a secrecy mechanism.
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

The fixture packs the published artifacts, installs them into a clean Next.js 16 App Router app,
builds partially prerendered and dynamic routes, starts the production server, probes route
authorization and capability tampering, checks for secret leakage, and reports direct-versus-
redirect HTML size and route work for 1, 20, and 100 images. Size measurements are deterministic;
wall-clock measurements are diagnostic and do not create flaky CI thresholds.
