# `@transloadit/img`

Responsive Transloadit Storage images for Next.js. Native `<picture>` format selection and
`srcset` sizing; image bytes go straight from Smart CDN to the browser, never through Next's
image optimizer. Sources are Storage paths or saved receipts, not arbitrary remote URLs.

**Not published yet:** this package remains private at `0.0.0` during dogfood. When published:

```bash
yarn add @transloadit/img
```

Use an existing Next.js 16 App Router app with React 19 and the Node.js server runtime, not Edge.
No custom TypeScript import settings or application module type are required. Maintainers testing
the unpublished packages should follow [local dogfood](../../docs/img-dogfood.md).

## Your first Storage image

Storage writes must be enabled for your workspace. Start with an opaque JPEG or PNG; the current
preview Built-in does not promise transparency preservation.

### Configure delivery

Put the following in the application's gitignored `.env.local`:

```dotenv
TRANSLOADIT_SMART_CDN_KEY=your-smart-cdn-auth-key
TRANSLOADIT_SMART_CDN_SECRET=your-smart-cdn-secret
TRANSLOADIT_WORKSPACE=your-workspace-slug
```

Use a **Smart CDN Auth Key**, not an Assembly-only key. The slug is the workspace name in
`/c/your-workspace/`, not its ID. Do not use `NEXT_PUBLIC_`. Supply all three values during both
`next build` and runtime: Next evaluates module-scoped factories while building routes.

### Store an original

Use `client.storeImage(filePath, { path: 'website/hero.jpg' })` with an **Assembly Auth Key** from
the same workspace. This write credential is separate from the rendering application's key.
The [local SDK seed recipe](../../docs/img-dogfood.md#store-one-image-and-keep-its-verified-metadata)
saves `image.json` atomically, preserving a prior receipt if a repeated upload fails.

The helper waits for completion and verifies `asset_id`, exact `path`, byte count, MD5 and positive
image dimensions. `/transloadit/store` annotates `results[':original']`, not `results.stored`.
EXIF-oriented dimensions describe the displayed image. Save the receipt in your app data or
database; rendering needs no metadata lookup. Receipt validation happens after the write and is
not a rollback. Existing paths fail with a conflict; retrying does not silently overwrite assets.

### Create a server-only component

Save as `lib/storageImage.ts`:

```ts
import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'

export const { StorageImage } = createTransloaditImageFromEnv({
  storage: { allowedPathPrefixes: ['website/'] },
})
```

Then in `app/page.tsx`:

```tsx
import image from '../image.json'
import { StorageImage } from '../lib/storageImage'

export default function Page() {
  return (
    <StorageImage
      alt="A canal house"
      src={image}
      sizes="(min-width: 960px) 960px, 100vw"
      style={{ display: 'block', height: 'auto', maxWidth: 960, width: '100%' }}
      preload
      loading="eager"
    />
  )
}
```

This hero is explicitly preloaded. Other images default to **native lazy loading in this
component**; HTML's own default is eager. `preload` implies eager and cannot combine with lazy.
Use `fetchPriority="high"` only for a measured LCP image.

`src` accepts `{ path, width, height }`, including complete SDK receipts. Only those three fields
enter signing; IDs and checksums do not. Object sources cannot also have separate dimensions.
A string `src` requires the source's intrinsic `width` and `height`.

## Private delivery and lifetime

Use authorized redirects for cached markup or private pages that may outlive a CDN signature.
The browser sends its native same-origin session cookie; it cannot add a custom Bearer header.

```ts
import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createTransloaditImageFromEnv({
  storage: {
    allowedPathPrefixes: ['website/'],
    delivery: {
      route: '/api/private-images',
      authorize: async ({ path, request }) => {
        const user = await authenticate(request)
        return user !== null && (await canReadStorageObject(user, path))
      },
    },
    expiresInMs: 5 * 60 * 1000,
    rotationIntervalMs: 30 * 1000,
  },
})
```

Implement `authenticate` and `canReadStorageObject` with your app's existing session and exact
object-access policy. Export the handler in `app/api/private-images/route.ts`:

```ts
export { storageRoute as GET, storageRoute as HEAD } from '../../../lib/storageImage'
```

Redirect capabilities hide filenames and bind one path and transformation. Authorization must
return exactly `true`. The handler responds with a fresh signed CDN URL in a `307`; no image bytes
pass through the app. By default each candidate load makes one app function invocation for
authorization and redirect — normally one per image per page view, more on candidate changes.

Default `Cache-Control: private, no-store` rechecks every redirect request. To trade faster repeat
loads for delayed reauthorization, opt in with `delivery.cacheMaxAgeMs: 30_000`. The `307` uses
`private, max-age=30` (HTTP seconds), capped at the rotation interval and signed lifetime. Errors
remain `no-store`. Cached redirects may grant access without a new app check until that age elapses.
CDN URLs already issued remain usable until their own expiry; downloaded bytes cannot be recalled.

### Direct delivery for request-authorized galleries

Direct delivery is the factory default and avoids per-image application requests. Authorize the
page's image data before rendering. `connection()` defers signing to the request, with an inert,
source-free Suspense shell for partial prerendering. Do not cache the signed markup in a shared
full-page cache. A lazy candidate requested after expiry can fail; direct URLs are bearer grants
until expiry. Prefer redirects for long-lived pages. `suspenseFallback` replaces only the pending
server shell, not browser image failures.

Prefixes are required: `[]` deliberately denies all and `['']` explicitly allows the workspace root.
Directory prefixes end in `/`; ambiguous paths are rejected. Prefixes bound signing but are not a
replacement for per-user object authorization. Rotate the secret together with cached markup:
existing redirect capabilities become invalid.

## Responsive policy

The default signed template is `builtin/storage-preview@0.0.1`. AVIF quality 45 and WebP quality
75 precede a JPEG quality 75 fallback. Formats use separate URLs, not unkeyed Accept negotiation.
Candidate widths follow 320, 640, 960, 1280, 1920, 2560, 3840 plus intrinsic width, bounded by the
source and backend dimensions. `widths` overrides the ladder; the JPEG fallback is no larger than
its largest candidate. For a 48px avatar, `widths={[48, 96]}` also caps JPEG at 96px.

Explicit `sizes` describes CSS layout; it does not set that layout. `sizes="auto, 100vw"` is valid
for lazy images only. `objectFit` controls CSS, while the default `r: 'pad'` preserves source
proportions in encoded candidates. The Built-in owns the padding background (currently white).
`formats` sets per-format quality; `fallbackQuality` sets JPEG quality.

The default minimum CDN lifetime is one hour with five-minute rotation windows. Configure
`storage.expiresInMs` and `rotationIntervalMs` explicitly when needed; their sum cannot exceed
48 hours. A 403/404 currently uses native broken-image/alt behavior. JPEG is a format fallback,
not HTTP-error recovery. Opt-in `deferUntilHydrated` delays noncritical images; leave it off
unless addressing an observed WebKit replay issue.

## Advanced integration

`createTransloaditImage({ authKey, authSecret, workspace, storage })` supports secret managers and
multiple workspaces. The env factory snapshots only the three rendering values; it loads no files
and never falls back to Assembly credentials. Both accept a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.
`Image` remains a deprecated factory alias for `StorageImage`.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.
