# `@transloadit/img`

Responsive Transloadit Storage images for Next.js. Native `<picture>` format selection and
`srcset` sizing; image bytes go straight from Smart CDN to the browser, never through Next's
image optimizer. Sources are Storage paths or saved receipts, not arbitrary remote URLs.

**Not published yet:** this package remains private at `0.0.0` during dogfood. When published:

```bash
yarn add @transloadit/img
yarn add -D @transloadit/node
```

Use an existing Next.js 16 App Router app with React 19 and the Node.js server runtime, not Edge.
No custom TypeScript import settings or application module type are required. Maintainers testing
the unpublished packages should follow [local dogfood](../../docs/img-dogfood.md).

## Your first Storage image

Storage writes must be enabled for your workspace, and the backend must provide
`builtin/storage-preview@0.0.2`. Start with a JPEG or PNG; transparent images retain their alpha
channel in AVIF, WebP and PNG previews, with an opaque JPEG fallback.

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

The CLI uses an **Assembly Auth Key** from the same workspace. Its existing credential resolution
checks `TRANSLOADIT_KEY` + `TRANSLOADIT_SECRET` in shell environment, the current directory's `.env`,
then `~/.transloadit/credentials` (or `TRANSLOADIT_CREDENTIALS_FILE`). Keep this write credential in
your CLI credentials file or seed-only shell, not the rendering app's env files: Next loads `.env`
too. The server enforces two key purposes by design: the rendering app holds a delivery-only key,
while the write-capable key stays in the seeding/upload environment; Assembly creation rejects a
Smart CDN key, and Smart CDN rejects an Assembly-only key. `--endpoint` is an optional trusted API
override.

```bash
yarn transloadit storage store ./hero.jpg website/hero.jpg --receipts images.json
```

The command wraps `client.storeImage()`, appends a record keyed by `website/hero.jpg`, and prints
a JSX snippet. It atomically replaces `images.json` only on success, preserving previous receipts
on conflicts, missing credentials and write failures. Parent directories must already exist.
A sibling lock prevents two writers from losing each other's records; after an interrupted
process, remove its `.lock` only after confirming no writer is still running. The Assembly client
is a seed-only development dependency, not part of image rendering or the browser bundle.

The helper waits for completion and verifies `asset_id`, exact `path`, byte count, MD5 and positive
image dimensions. `/transloadit/store` annotates `results[':original']`, not `results.stored`.
EXIF-oriented dimensions describe the displayed image. Save the receipt in your app data or
database; rendering needs no metadata lookup. Receipt validation happens after the write and is
not a rollback. Existing paths fail with a conflict; retrying does not silently overwrite assets.

### Create a server-only component

For a private app, start with request-authorized redirects. Save as `lib/storageImage.ts`:

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

Then in `app/page.tsx`:

```tsx
import images from '../images.json'
import { StorageImage } from '../lib/storageImage'

export default function Page() {
  return (
    <StorageImage
      alt="A canal house"
      src={images['website/hero.jpg']}
      layout="constrained"
      maxWidth={960}
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
enter signing; IDs and checksums do not. Without a layout mode, object sources cannot also have
separate dimensions. A string `src` requires the source's intrinsic `width` and `height`.

## Layout without the arithmetic

`layout="constrained" maxWidth={960}` derives proportional responsive CSS, the
`(min-width: 960px) 960px, 100vw` sizes expression and a ladder capped at 1920px and the source.

```tsx
<StorageImage
  src={images['website/avatar.jpg']}
  alt="Your profile photo"
  layout="fixed"
  width={48}
  height={48}
  fit="cover"
/>
```

Fixed layout keeps intrinsic dimensions in `src`; `width` and `height` describe the display box.
It derives `sizes="48px"`, 48/96px candidates and a 48px JPEG fallback. `fit="cover"` requests a
signed `fillcrop` at the box ratio, so a square avatar does not download an uncropped original.
The default `fit="contain"` keeps the source proportions with CSS letterboxing.

```tsx
<div style={{ position: 'relative', aspectRatio: '9/16' }}>
  <StorageImage
    src={images['website/hero.jpg']}
    alt="A canal house"
    layout="fill"
    fit="cover"
    aspectRatio="9/16"
    sizes="100vw"
  />
</div>
```

Fill layout occupies an already-sized, positioned parent. Cover requires its aspect ratio: the
source cannot tell us the container's shape. Smart CDN crops to that ratio, eliminating the
oversized `sizes` arithmetic needed for CSS-only cover. Match `aspectRatio` to the actual box.
All layout modes preserve explicit `sizes`, `widths`, `style` and `objectFit` overrides. Source
and backend limits still apply. `widths` overrides even the constrained mode's default 2× cap.
Without `layout`, the explicit API remains available; its encoding strategy stays `pad`.

## Private delivery and lifetime

Use authorized redirects for cached markup or private pages that may outlive a CDN signature.
The browser sends its native same-origin session cookie; it cannot add a custom Bearer header.

Redirect capabilities hide filenames and bind one path and transformation. Authorization must
return exactly `true`. The handler responds with a fresh signed CDN URL in a `307`; no image bytes
pass through the app. By default each candidate load makes one app function invocation for
authorization and redirect — normally one per image per page view, more on candidate changes.

Default `Cache-Control: private, no-store` rechecks every redirect request. To trade faster repeat
loads for delayed reauthorization, opt in with `delivery.cacheMaxAgeMs: 30_000`. The `307` uses
`private, max-age=30` (HTTP seconds), capped at the rotation interval and signed lifetime. Errors
remain `no-store`. Cached redirects may grant access without a new app check until that age elapses.
CDN URLs already issued remain usable until their own expiry; downloaded bytes cannot be recalled.

On the default `*.tlcdn.com` CloudFront host, `NoCacheSigExp` excludes `sig`, `exp`, `signature`,
`expires` and `s` from the cache key, so signature rotation alone does not bust the candidate cache;
entries still obey the origin's expiry-bounded `Cache-Control`, whereas the legacy `*.edgly.net`
Bunny zone keys on the whole query string and should not be used for this integration.

### Direct delivery for request-authorized galleries

Direct delivery remains the factory default for existing integrations, but is an explicit
optimization for request-authorized galleries, not this private-app walkthrough. Configure it as:

```ts
export const { StorageImage } = createTransloaditImageFromEnv({
  storage: { allowedPathPrefixes: ['website/'], delivery: 'direct' },
})
```

It avoids per-image application requests. Authorize the
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

The default signed template is `builtin/storage-preview@0.0.2`. AVIF quality 45 and WebP quality
75 precede a JPEG quality 75 fallback. Formats use separate URLs, not unkeyed Accept negotiation.
Candidate widths follow 320, 640, 960, 1280, 1920, 2560, 3840 plus intrinsic width, bounded by the
source and backend dimensions. `widths` overrides the ladder; the JPEG fallback is no larger than
its largest candidate. For a 48px avatar, `widths={[48, 96]}` also caps JPEG at 96px.

Explicit `sizes` describes CSS layout; it does not set that layout. Without a derived or explicit
size, lazy images default to `sizes="auto, 100vw"` (automatic CSS-box sizing where supported,
viewport fallback otherwise); eager/preloaded images retain `100vw`. Auto sizing is lazy-only.
`objectFit` controls CSS, while the default `r: 'pad'` preserves source
proportions in encoded candidates. AVIF/WebP/PNG candidates sign `bg: '#00000000'` to preserve
transparency through both preview and encoding; JPEG signs an opaque background, white by default.
`fallbackBackground="#224466"` changes only the JPEG background (six RGB hex digits, or eight RGBA
digits ending in `ff`). Named colors and transparent JPEG backgrounds are rejected before signing.
Pass raw hex colors: URL signing encodes `#` as `%23`. `bg` cannot be overridden through global
`urlParams`. A custom Template must support the same background field contract.
`formats` sets per-format quality; `fallbackQuality` sets JPEG quality.

The default minimum CDN lifetime is one hour with five-minute rotation windows. Configure
`storage.expiresInMs` and `rotationIntervalMs` explicitly when needed; their sum cannot exceed
48 hours. Without `errorFallback`, a 403/404 uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery. Opt-in `deferUntilHydrated` delays noncritical images; leave it
off unless addressing an observed WebKit replay issue.

## Diagnose and handle image failures

In development only, the server performs one HEAD per unique path/Template per factory, with a
five-second timeout. Concurrent/repeated renders share that probe. Redirects probe only after
application authorization; disallowed prefixes fail before any request. Production performs no
diagnostic requests. Restart development to retry a failed check or after changing credentials.

Hints cover Smart CDN-enabled versus Assembly-only keys, workspace/Storage path/Template setup,
signature secrets, expiry and clock errors, and endpoint reachability. A generic 403 cannot tell us
which of those is wrong. Neither raw responses, errors, signed URLs nor secrets are logged.
The probe can trigger one cold transformation in development; it does not weaken authorization.

```tsx
<StorageImage
  src={images['website/hero.jpg']}
  alt="A canal house"
  layout="constrained"
  maxWidth={960}
  errorFallback={<p role="status">Image unavailable</p>}
/>
```

This optional small client boundary keeps the exact server-rendered picture and replaces it only
after a failed native image load, including one completed before hydration. It adds no wrapper
element or retry loop. A changed source remounts the boundary. With no JavaScript, native image
failure behavior remains. A cross-origin browser error cannot identify the HTTP failure reason.
This is separate from `suspenseFallback`, which handles pending server signing, and from JPEG
format fallback, which does not recover failed AVIF/WebP requests.

## Advanced integration

### Images uploaded by your users

The CLI is for repository/content seeding. In an application, use Uppy with its Transloadit plugin
or your existing Assembly upload flow, with a server-owned `/transloadit/store` step:

```json
{
  "steps": {
    "stored": {
      "robot": "/transloadit/store",
      "use": ":original",
      "path": "uploads/server-generated-upload-id/${file.url_name}",
      "conflict_strategy": "error"
    }
  }
}
```

The application server authenticates the uploader, chooses the destination prefix/upload ID,
and signs the Assembly parameters or a trusted Template. Transloadit interpolates the literal
`${file.url_name}`. Do not put the Assembly secret in Uppy/browser code or let a client choose
another user's destination/steps. Enable `uploads/` in the rendering factory's allowed prefixes
only alongside an exact per-object ownership check in `authorize`.

Treat an Assembly notification as a wake-up signal: fetch the completed Assembly on the server
through the SDK with your write-side credentials. Correlate its ID with the upload your server
authorized. Do not persist a browser-supplied receipt without that independent check. The store result annotates
`results[':original']`: require `ASSEMBLY_COMPLETED`, the expected files and destination paths,
nonempty typed `asset_id`, positive size/dimensions and a valid `md5hash`. For uploads with known
expected size/checksum, compare those too. For transformed inputs, inspect the named input step
that `/transloadit/store` annotates instead.

Persist at least `{ path, width, height, asset_id }` together with your own owner/project ID;
keeping `size` and `md5hash` also helps integrity checks. Store **display** dimensions: EXIF values
5–8 (including mirrored rotations) swap width and height; values 1–4 do not. API metadata may use
ExifTool orientation labels instead of numbers. The local-file `storeImage()` helper already
normalizes these; your notification ingestion must do the same before creating a receipt.

Read the saved receipt in an authorized Server Component and pass it as `src`:

```tsx
<StorageImage src={savedImage} alt={savedImage.description} layout="constrained" maxWidth={960} />
```

`savedImage` is the application's validated database record; the extra owner/asset/checksum fields
are not forwarded to CDN signing. Delivery resolves by path, not `asset_id` or checksum: those
fields do not pin bytes if you intentionally replace the path later. Prefer immutable paths.
The browser never needs the Assembly secret, Smart CDN secret, or a render-time metadata lookup.

### Credentials and framework adapters

`createTransloaditImage({ authKey, authSecret, workspace, storage })` supports secret managers and
multiple workspaces. The env factory snapshots only the three rendering values; it loads no files
and never falls back to Assembly credentials. Both accept a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.
`Image` remains a deprecated factory alias for `StorageImage`.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.
