# `@transloadit/img`

Responsive images powered by Transloadit Smart CDN. The package signs deterministic AVIF and WebP
candidate sets on the server and lets the browser choose the best candidate through native
`<picture>` and `srcset` behavior.

This workspace is private while the API and production dogfood soak. Do not depend on version
`0.0.0` from npm.

## Next.js

Configure one Server Component in a server-only application module:

```tsx
import { createTransloaditImage } from '@transloadit/img/next/server'

const authKey = process.env.TRANSLOADIT_KEY
const authSecret = process.env.TRANSLOADIT_SECRET
const workspace = process.env.TRANSLOADIT_WORKSPACE

if (!authKey || !authSecret || !workspace) {
  throw new Error('Transloadit image credentials are required')
}

export const TransloaditImage = createTransloaditImage({
  allowedSourceOrigins: ['https://assets.example'],
  authKey,
  authSecret,
  storage: { allowedPathPrefixes: ['documents/'] },
  workspace,
})
```

The factory never reads environment variables itself. Its auth secret signs URLs on the server and
is not placed in rendered markup or client bundles.

### Public URL image

Public URL inputs are suitable for static rendering. Supply intrinsic source dimensions so
candidate widths can be capped truthfully, plus one fixed expiry. Rebuild or revalidate the page
before that expiry. The static render deliberately does not read the current clock or reject an
elapsed timestamp, because doing so would opt the render into synchronous request-time I/O.

```tsx
import { TransloaditImage } from '../lib/TransloaditImage'

export default function Page() {
  return (
    <TransloaditImage
      alt="A canal house"
      expiresAt={Date.UTC(2030, 0, 1)}
      fallbackSrc="/images/canal-house.jpg"
      height={800}
      sizes="(min-width: 1024px) 960px, 100vw"
      source={{
        height: 1600,
        type: 'url',
        url: 'https://assets.example/canal-house.jpg',
        width: 2400,
      }}
      width={1200}
      widths={[480, 960, 1200, 1920]}
    />
  )
}
```

URL sources must be public HTTP(S) URLs without user information, query strings, or fragments.
Their exact origin (scheme, host, and any non-default port) must occur in the factory's
`allowedSourceOrigins`; the default is deny-all. An HTTPS origin does not authorize HTTP. Use
Transloadit Storage for private inputs rather than copying source credentials into browser HTML.
`fallbackSrc` is rendered directly and may be relative or a data URL; keep it application-owned and
never derive it from an untrusted request.

### Transloadit Storage preview

A Storage source uses signed-only `builtin/storage-preview@0.0.1`. It can produce an image preview
for an image, document, video, audio file, or unknown file type. The component uses Next.js
`connection()` before signing and derives a stable, short-lived expiry. An internal Suspense boundary
lets Cache Components prerender a safe shell, but the signed image is rendered per request and must
not be placed in a shared full-page cache.

Storage signing is deny-all until `storage.allowedPathPrefixes` explicitly authorizes a directory.
Prefixes must be relative and end in `/`; `['']` deliberately grants the entire workspace. Keep
request-derived paths behind your application authorization as well: a prefix is a hard workspace
boundary, not a replacement for checking whether the current user may read a particular object.
Dot segments and backslashes are rejected before prefix matching.
Paths also follow API2's catalog grammar: NFC-normalized Unicode, no control characters or empty
segments, and at most 1024 UTF-8 bytes.

```tsx
import { TransloaditImage } from '../lib/TransloaditImage'

export default function Page() {
  return (
    <TransloaditImage
      alt="Preview of report.pdf"
      height={300}
      sizes="(min-width: 768px) 400px, 100vw"
      source={{ path: 'documents/report.pdf', type: 'storage' }}
      suspenseFallback={<div aria-label="Loading preview" />}
      width={400}
      widths={[200, 400, 800]}
    />
  )
}
```

Storage previews default to AVIF quality 45 and WebP quality 75 sources plus a signed JPEG quality
75 fallback. They use the Built-in's `pad` strategy so every `w` descriptor matches the actual
output width without cropping or distorting an input whose dimensions are not known ahead of time.
`builtin/storage-serve` is intentionally not an image source: it delivers the original private
object for raw viewing or download.

Storage support requires `builtin/storage-preview@0.0.1` to be deployed in the target Transloadit
environment. The default signed URL lifetime is at least one hour, rounded into stable five-minute
windows. Both values can be configured, but their sum may not exceed 48 hours:

```tsx
export const TransloaditImage = createTransloaditImage({
  authKey,
  authSecret,
  storage: {
    allowedPathPrefixes: ['documents/'],
    expiresInMs: 30 * 60 * 1000,
    rotationIntervalMs: 5 * 60 * 1000,
  },
  workspace,
})
```

### Loading behavior

- Public URL images are lazy by default. Storage previews are eager by default so a candidate that
  was never requested cannot first enter the viewport after its signature expires. Set
  `loading="lazy"` explicitly when the page's expected lifetime and bandwidth tradeoff make that
  appropriate.
- `preload` implies eager loading. Combine it with `fetchPriority="high"` for a measured LCP image;
  an explicitly lazy preload is rejected.
- `preload` cannot be combined with `media`: React 19 does not include `media` in responsive
  preload identity and can silently collapse complementary hints. Use `fetchPriority="high"` for a
  media-gated image instead.
- For public URL images, `media` applies the viewport condition to every source and leaves the
  fallback `<img>` inert when it does not match. Apply the same condition to the surrounding layout
  if the unmatched slot must not reserve its declared width and height. The neutral default
  placeholder is an inline GIF; set `mediaPlaceholderSrc` to a same-origin transparent asset when
  CSP excludes `data:` from `img-src`. Storage previews reject `media`, because a candidate first
  requested after the condition changes could already have an expired signature.
- Set `objectFit="cover"` (or another explicit CSS `object-fit` value) when display dimensions use a
  materially different aspect ratio from the public source. The component tolerates normal
  sub-pixel metadata rounding, but rejects an unhandled mismatch rather than silently stretching
  the image.
- `deferUntilHydrated` withholds non-critical candidate elements until hydration to avoid WebKit's
  parser-to-hydration replay. It cannot be combined with eager loading or preloading and retains a
  `<noscript>` fallback. This controls browser requests, not secrecy: signed model URLs can still be
  serialized in a Next.js RSC/Flight payload.
- `formats={{ avif: 45, webp: 75 }}` customizes format-specific quality for both URL images and
  Storage previews. Storage also accepts `fallbackQuality={70}` for its signed JPEG fallback.
- Storage's JPEG fallback defaults to the declared display width (bounded by backend limits), not
  the largest responsive candidate, to avoid oversized downloads in legacy and `<noscript>` paths.
- Widths above the source or backend-safe limit are capped and deduplicated; the effective widths
  remain visible in the returned model's candidates.

Compatible workspace Templates can replace either Built-in in trusted factory configuration:

```tsx
const TransloaditImage = createTransloaditImage({
  allowedSourceOrigins: ['https://assets.example'],
  authKey,
  authSecret,
  storage: { allowedPathPrefixes: ['documents/'] },
  templates: {
    storage: 'my-storage-preview',
    url: 'my-serve-image',
  },
  workspace,
})
```

Template selection is factory-only because the factory owns signing credentials. A replacement must
support the same trusted fields as the corresponding Built-in. The lower-level framework-neutral
model accepts a trusted `template` option for adapters that enforce their own policy boundary.
Adapters must likewise authorize each Storage path and public-source origin before calling the
model; the framework-neutral signer has no application identity or access-control context.

## Framework-neutral model

`@transloadit/img` exports `createTransloaditImageModel` and its serializable model types. Inject a
server-side signer to build candidates without coupling image policy to a credential store or UI
framework. If model inputs can be request-derived, that low-level adapter must keep Template choice
trusted and enforce its own remote-origin allowlist before signing. `@transloadit/img/next` renders an
already-signed model and has no access to credentials.

## Development

```console
corepack yarn workspace @transloadit/img check
corepack yarn test:img:fixture
```

The fixture packs the real artifacts, installs their tarballs with a committed dependency graph in
a clean Next.js 16 App Router application, builds static URL and dynamic Storage routes, starts the
production server, and checks that secrets never reach browser-visible output.
