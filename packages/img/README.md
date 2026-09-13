# `@transloadit/img`

Responsive Transloadit Storage images for Next.js. Native `<picture>` format selection and
`srcset` sizing; image bytes go straight from Smart CDN to the browser, never through Next's
image optimizer. Sources are Storage paths or saved receipts, not arbitrary remote URLs.

Public images can prerender with long-lived direct CDN URLs: no image route, signing shell or
per-view function invocation. Private images can use request-authorized redirects with native cookies.

**Not published yet:** this package remains private at `0.0.0` during dogfood. When published:

```bash
yarn add @transloadit/img
yarn add -D @transloadit/node
```

Use an existing Next.js 16 App Router app with React 19 and the Node.js server runtime, not Edge.
Next uses the Node.js runtime by default. Use a security-patched release (16.3.3 or newer).
No custom TypeScript import settings or application module type are required. Maintainers testing
the unpublished packages should follow [local dogfood](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md).
With npm, install the same packages with `npm install` / `npm install -D`, then use
`npx --no transloadit` instead of `yarn transloadit`. Stock create-next-app already enables JSON imports.

## Your first Storage image

Storage writes must be enabled for your workspace, and the backend must provide
`builtin/storage-preview@0.0.2`. Start with a JPEG or PNG; transparent images retain their alpha
channel in AVIF, WebP and PNG previews, with an opaque JPEG fallback.

### Log in, configure delivery and store an original

Run from your app root (beside `package.json`); `images.json` is written there:

```bash
yarn transloadit auth login
yarn transloadit image init website/ --public --write-env
yarn transloadit storage store ./hero.jpg website/hero.jpg --public
```

Login verifies one signed read before saving CLI credentials outside your app. Init prompts for
the separate rendering key and writes the factory and owner-only `.env.local`, without overwriting
existing files. `--public` explicitly declares `website/` public. Store prints the complete factory
and page below; keep the factory init already created. **Commit images.json**, never `.env.local`.
Both store and receipts sync default to `images.json`; `--receipts` selects another catalog.
Store's `--public`/`--private` flags select the printed integration; they do not change a Storage
object's permissions. The factory's explicit `public` policy controls delivery. Init prompts for
rendering values only with `--write-env`; omit it when your runtime already supplies those values.

### Create your component

Init has created `lib/storageImage.ts`. For manual setup, its essential contents are:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import images from '../images.json'

export const { StorageImage } = createStorageImages({
  images,
  public: ['website/'],
})
```

Then in `app/page.tsx`:

```tsx
import { StorageImage } from '../lib/storageImage'

export default function Page() {
  return (
    <StorageImage
      alt="A canal house"
      src="website/hero.jpg"
      layout="constrained"
      maxWidth={960}
      preload
    />
  )
}
```

For stock `src/app`, put the factory in `src/lib/storageImage.ts` and import the root catalog
from `'../../images.json'`. The page's `'../lib/storageImage'` import stays the same.

Without `--write-env`, add the three rendering values to your gitignored `.env.local`, then start Next:

```dotenv
TRANSLOADIT_WORKSPACE=your-workspace-slug
TRANSLOADIT_SMART_CDN_KEY=your-smart-cdn-auth-key
TRANSLOADIT_SMART_CDN_SECRET=your-smart-cdn-secret
```

Prerendering signed public HTML needs these values during `next build`. Factories validate env
credentials on first render/request, not on import: builds that only request-render private direct
images can supply them at runtime alone. A secretless build cannot prerender signed public URLs.
Do not prefix them with `NEXT_PUBLIC_`.
That's your first image. `preload` implies eager; other images default to native lazy loading.

Init detects `app/` or `src/app/`; `--next` is optional. Omit `--write-env` to leave all env files
untouched. With `--write-env --stdin`, supply exactly those three rendering variables in dotenv
format instead of terminal prompts. It refuses to overwrite existing code or `.env.local`.

Catalog keys autocomplete in `src`; a typo is a TypeScript error. Receipt objects from a database
still work as `src`. Allowed directories are inferred from catalog paths, or narrowed explicitly
with `allowedPathPrefixes`. A root-level catalog file permits only that exact file, not its siblings.
The default public lifetime is one year; use `lifetime: '365d'` to make it explicit. Rebuild before
expiry. Public revocation means key rotation **and** rebuilding cached markup; already cached or
downloaded bytes cannot be recalled.

## Ship it privately

Use request-authorized redirects for private images or cached pages. The browser sends its native
same-origin session cookie; it cannot add a custom Bearer header. Replace the factory with:

```ts
import { createPrivateStorageImages } from '@transloadit/img/next/server'
import images from '../images.json'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createPrivateStorageImages({
  images,
  authorize: async ({ path, request }) => {
    const user = await authenticate(request)
    return user !== null && (await canReadStorageObject(user, path))
  },
})
```

Implement `authenticate` and `canReadStorageObject` with your existing session and exact
object-access policy. `request` is a standard Web `Request`: pass it to your session library,
which can read its `Cookie` header. The callback receives the decoded Storage path, not a URL.
Allowed requests get a `307`; denied requests return `404` without exposing the path or reason.
Export the handler in `app/api/storage-images/route.ts`:

```ts
export { storageRoute as GET, storageRoute as HEAD } from '../../../lib/storageImage'
```

The default route is `/api/storage-images`; set `route` only if you move the handler.
The page stays unchanged. `image init --private website/` generates a private route and
a factory that denies all requests until you wire in your authorization. Prefixes limit signing,
not per-user access. An empty array denies all; `allowWorkspaceRoot: true` explicitly permits the
entire workspace. Empty-string prefixes are rejected. All factories share the same flat options:
`images`, `allowedPathPrefixes`, `public`, `authorize`, `lifetime` and `route`.
Trusted `template`, `baseUrl` and `urlParams` overrides also work on the private factory.
For your own sign-in or unavailable-image UI, use the optional `errorFallback` shown below.

### Mixed private and public redirects

For marketing pages, prefer the direct public factory above: zero application image requests.
When sharing a private integration, explicitly publish only its marketing directories with
`public: ['website/']`. Their redirects skip authorization
and use `public, max-age=0, s-maxage=<rotation>, stale-while-revalidate=60`, bounded by the remaining
grant lifetime including the stale window. All other directories stay behind `authorize` with
`private, no-store`. Public prefixes must be inside `allowedPathPrefixes`; nothing becomes public
implicitly. Do not put account-specific data in a public prefix.
Public declarations must name directories; there is no implicit workspace-wide public declaration.

Static markup plus a cached 307 avoids app invocations on shared-cache hits. Cold entries and
revalidation still invoke the handler; your hosting CDN must honor these headers. The built-in
Next development server is not a shared CDN. Removing a public prefix does not recall a cached
redirect or already-issued grant; wait for their lifetime when changing access policy.

### Credentials and writes

`auth login` saves an **Assembly Auth Key** to `~/.transloadit/credentials` (or the explicit
shell `TRANSLOADIT_CREDENTIALS_FILE` override) with owner-only permissions. Project `.env` cannot
redirect login's write destination, and login refuses app env filenames. Existing credentials require
`--replace`. For automation, `auth login --stdin` reads `TRANSLOADIT_KEY` and
`TRANSLOADIT_SECRET` in dotenv format; never put secrets in command-line arguments.
Shell credentials use those same two names. Gitignore any credentials-file override inside a repo.
Login verifies one signed Template read (the key needs read scope), not Storage write activation.
It prints the Console credential link on verification failure and saves nothing. Verification uses
production unless `--endpoint` explicitly selects another trusted origin; a project `.env` cannot
redirect newly entered credentials. That explicit endpoint is saved with the key.
CLI lookup remains shell environment, current directory `.env`, then the credentials file.
Keep the write key out of app env files: Next reads `.env` too.

Rendering uses a **Smart CDN Auth Key** from the same workspace. The server separates the two
purposes by design: Assembly creation rejects a Smart CDN key; Smart CDN rejects an Assembly-only
key. `TRANSLOADIT_WORKSPACE` is the slug in `/c/your-workspace/`, not a workspace ID.
Factory imports need no rendering credentials. First use snapshots and validates them. Public
prerenders and private capability prerenders need a build-time secret; request-only direct rendering
can defer the secret to runtime. Supply rendering credentials to the deployed private handler too.

The Assembly client is a seed-only dependency; it is not part of rendering or the browser.
`--endpoint` selects an explicit trusted CLI API override. After login, ordinary commands can also
use `TRANSLOADIT_ENDPOINT` according to the credential lookup rules. The separate
`TRANSLOADIT_ASSEMBLY_ENDPOINT` in the maintainer seed script is only for that script.
See [local dogfood](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md)
for direct devdock delivery, including the required CDN acknowledgment.

## Layout without the arithmetic

`layout="constrained" maxWidth={960}` derives proportional responsive CSS, the
`auto, (min-width: 960px) 960px, 100vw` sizes expression for lazy images and a ladder capped at
1920px and the source. Eager/preloaded images omit `auto`. Explicit `sizes` remains your override.

```tsx
<StorageImage
  src="website/avatar.jpg"
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
    src="website/hero.jpg"
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

For different mobile and desktop crops, pass width breakpoints in priority order and a default:

```tsx
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  layout="fill"
  fit="cover"
  aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
  sizes="(min-width: 960px) 960px, 100vw"
  preload
/>
```

Size the positioned parent to those same ratios in your responsive CSS. Each breakpoint gets
real `fillcrop` candidates and its own JPEG fallback; preloads select only the matching crop.
Use up to eight `(min-width: …)` or `(max-width: …)` conditions with px, em or rem. No oversized
viewport-width arithmetic is needed. Receipts always supply intrinsic signing geometry;
separate `width`/`height` props describe presentation, even without fixed layout. One presentation
dimension derives the other proportionally.

## Under the hood

### Redirect lifetime and caching

Redirect capabilities hide filenames and bind one path and transformation. Authorization must
return exactly `true`. The handler responds with a fresh signed CDN URL in a `307`; no image bytes
pass through the app. By default each candidate load makes one app function invocation for
authorization and redirect — normally one per image per page view, more on candidate changes.
The matching responsive preload is reused by the image, not a second intended redirect.
Redact capabilities and signed CDN query strings from logs. A private capability still requires
application authorization; a downstream signed CDN URL is usable until its own expiry.
The capability has no independent expiry: current prefix and authorization policy is checked
again at the handler. Key/route/custom-Template or capability-contract changes can invalidate it.
Only cached redirects and already-issued CDN grants delay revocation.

Default `Cache-Control: private, no-store` rechecks every redirect request. To trade faster repeat
loads for delayed reauthorization, opt in with `cacheMaxAgeMs: 30_000`. The `307` uses
`private, max-age=30` (HTTP seconds), capped at the rotation interval and signed lifetime. Errors
remain `no-store`. Cached redirects may grant access without a new app check until that age elapses.
CDN URLs already issued remain usable until their own expiry; downloaded bytes cannot be recalled.

Production Smart CDN uses Bunny for `*.tlcdn.com`: hostname and the whole query string form the
cache key. Changing expiry/signature creates a new cache entry. Private grants rotate every
30 minutes by default; public direct markup retains its build-time URLs. Shorter rotation
intervals mean more cold transformations when new markup or redirects issue new signatures.

### Direct delivery for request-authorized galleries

Omitting `public` and `authorize` chooses request-rendered private direct delivery. It can reduce
application requests for galleries whose page data is already authorized:

```ts
export const { StorageImage } = createStorageImages({
  allowedPathPrefixes: ['website/'],
})
```

It avoids per-image application requests. Authorize the
page's image data before rendering. `connection()` defers signing to the request, with an inert,
source-free Suspense shell for partial prerendering. Do not cache the signed markup in a shared
full-page cache. A lazy candidate requested after expiry can fail; direct URLs are bearer grants
until expiry. Prefer redirects for long-lived pages. `suspenseFallback` replaces only the pending
server shell, not browser image failures.

Without a catalog, prefixes or `allowWorkspaceRoot: true` are required. `[]` deliberately denies all.
Directory prefixes end in `/`; ambiguous paths are rejected. Prefixes bound signing but are not a
replacement for per-user object authorization. Rotate the secret together with cached markup:
existing redirect capabilities become invalid.

### Template migrations and revocation

Capabilities bind the payload-contract version, workspace and route/basePath, not the default
Built-in version. An SDK upgrade can pin a new compatible `storage-preview` without breaking old
private markup: the new handler signs with its current Built-in and rechecks current authorization.
There are no `previousTemplates` options or time-window chores for consumers.

An explicitly configured `template` is bound to the capability. Coordinate custom Template changes
with a cached-markup rebuild. Payload-contract changes also require a capability-version bump and
rebuild; ordinary Built-in updates do not. Rotating the signing secret invalidates existing
capabilities. Already-issued or cached CDN grants remain usable until their own expiry.

## Responsive policy

The default signed template is `builtin/storage-preview@0.0.2`. AVIF quality 45 and WebP quality
75 precede a JPEG quality 75 fallback. Formats use separate URLs, not unkeyed Accept negotiation.
Candidate widths follow 320, 640, 960, 1280, 1920, 2560, 3840 plus intrinsic width, bounded by the
source and backend dimensions. `widths` overrides the ladder; the JPEG fallback is no larger than
its largest candidate. For a 48px avatar, `widths={[48, 96]}` also caps JPEG at 96px.

Explicit `sizes` describes CSS layout; it does not set that layout. Without a derived or explicit
size, lazy images default to `sizes="auto, 100vw"` (automatic CSS-box sizing where supported,
viewport fallback otherwise); eager/preloaded images retain `100vw`. Auto sizing is lazy-only:
Chrome 126+, [Firefox 150+](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/150)
and [Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/#html).
Older browsers, including Safari 26, use the listed fallback. Keep explicit fallback lengths.
`objectFit` controls CSS, while the default `r: 'pad'` preserves source
proportions in encoded candidates. AVIF/WebP/PNG candidates sign `bg: '#00000000'` to preserve
transparency through both preview and encoding; JPEG signs an opaque background, white by default.
`fallbackBackground="#224466"` changes only the JPEG background (six RGB hex digits, or eight RGBA
digits ending in `ff`). Named colors and transparent JPEG backgrounds are rejected before signing.
Pass raw hex colors: URL signing encodes `#` as `%23`. `bg` cannot be overridden through global
`urlParams`. A custom Template must support the same background field contract.
`formats` sets per-format quality; `fallbackQuality` sets JPEG quality.

`lifetime` is a **maximum**, in milliseconds or a duration such as `'1h'` or `'365d'`, on every
factory. Defaults: one hour for private paths, one year for explicitly public paths. Private
grants never exceed 48 hours, including in a mixed factory with a longer public lifetime.
The default rotation interval is half the lifetime, capped at one hour. For the private default,
a newly issued grant has 30–60 minutes remaining, never 60–120. Advanced `rotationIntervalMs`
chooses a stable bucket inside the maximum; smaller buckets reduce variation but fragment the
CDN cache more. Public direct URLs use the factory's captured time, so rebuild before they expire.
Without `errorFallback`, a 403/404 uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery. Opt-in `deferUntilHydrated` delays noncritical images; leave it
off unless addressing an observed WebKit replay issue.

## Diagnose and handle image failures

In development only, the server performs one HEAD per unique path/Template per factory, with a
five-second timeout. The probe runs in the background and never holds up the image or redirect.
Concurrent/repeated renders share that probe. Redirects probe only after
application authorization; disallowed prefixes fail before any request. Production performs no
diagnostic requests. Restart development to retry a failed check or after changing credentials.

Denied redirect routes also emit one development-only hint per reason: route/basePath mismatch,
invalid or stale capability (secret/Template changes), disallowed prefix, or failed authorization.
These messages contain no requested path, URL or secret. Next's bundled server modules infer
`basePath` from its build configuration; supply it explicitly for externalized integrations.
Private direct delivery logs once per factory that it makes the route dynamic; public direct does not.

Hints cover Smart CDN-enabled versus Assembly-only keys, workspace/Storage path/Template setup,
signature secrets, expiry and clock errors, and endpoint reachability. A generic 403 cannot tell us
which of those is wrong. Neither raw responses, errors, signed URLs nor secrets are logged.
The probe can trigger one cold transformation in development; it does not weaken authorization.

```tsx
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  layout="constrained"
  maxWidth={960}
  errorFallback={<p role="status">Image unavailable</p>}
/>
```

This optional small client boundary keeps the exact server-rendered picture and replaces it only
after a failed native image load, including one completed before hydration. It adds no wrapper
element or retry loop. A changed source remounts the boundary. For a same-page sign-in followed
by `router.refresh()`, pass a non-secret session-dependent `retryKey`, for example
`retryKey={user?.id ?? 'anonymous'}`. The refreshed Server Component then resets a failed image
even though its redirect URL has not changed. A deliberate retry counter also works. Refreshing
alone does not reset a stable failed boundary, and unchanged keys never cause retry loops.
With no JavaScript, native image
failure behavior remains. A cross-origin browser error cannot identify the HTTP failure reason.
This is separate from `suspenseFallback`, which handles pending server signing, and from JPEG
format fallback, which does not recover failed AVIF/WebP requests.

## Advanced integration

### Receipt integrity and recovery

The store command wraps `client.storeImage()`, waits for completion and validates `asset_id`,
exact path, byte count, MD5 and positive EXIF-oriented display dimensions. The receipt lands in
`results[':original']`, not `results.stored`. Rendering requires no metadata lookup.

The CLI atomically appends to the JSON object keyed by Storage path, preserving earlier receipts
on failure. Parent directories must exist. A sibling lock prevents concurrent writers from losing
each other's records; remove an interrupted process's lock only after confirming it has stopped.
Receipt validation occurs after the Storage write, not as a rollback. A failed receipt may mean
the object already exists. Existing paths conflict by default.

`storage ls website/` lists the current workspace using its read-scoped Auth Key and the existing
S3-compatible read API, without an Assembly. `--workspace` overrides automatic workspace discovery.
It uses the endpoint saved with those key credentials; `--endpoint` is an explicit trusted override
and accepts the API origin, not a bucket URL. The rendering factory's `baseUrl` is unrelated.
The Storage S3 API must be enabled separately: successful Assembly-based storage or image delivery
does not imply that listing is enabled. A disabled S3 API returns HTTP 403, even with valid credentials.
`storage store --overwrite` explicitly replaces an occupied path; it is never the default. Prefer
immutable filenames because delivery resolves paths, not receipt hashes, and cached bytes can outlive
an overwrite.

Recover or refresh a rendering catalog without re-uploading or downloading originals:

```console
yarn transloadit storage receipts sync website/ --receipts images.json
```

This uses paginated List + HEAD with the same read-scoped credentials, `--workspace` and
`--endpoint` options as `storage ls`. HEAD's `x-amz-meta-dam-width` and `x-amz-meta-dam-height`
rebuild `{ path, width, height }`, which can be passed directly as `StorageImage`'s `src`.
`md5hash` is included only for compatible single-part ETags; multipart, opaque and SSE-KMS/SSE-C
ETags are not treated as MD5. See [S3's ETag contract](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html).
HEAD does not expose `asset_id`: sync recovers rendering metadata, not a verified upload receipt.
Matched entries are replaced with this rendering shape, so keep full upload receipts separately
if your application needs their asset IDs or upload-integrity evidence.

Sync adds or refreshes matching paths and never prunes unmatched entries. Any missing/invalid
dimensions, failed HEAD or incomplete listing leaves the existing file intact; a failed atomic
replacement retains the complete temporary catalog for recovery. Choose an image-only prefix;
older objects without dimensions need a catalog backfill. Storage records EXIF-oriented display
dimensions for new image uploads, so sync matches `storeImage` receipts for rotated photos too.
Commit `images.json` before building so rendering needs no runtime metadata lookup; it can now
be regenerated from Storage rather than being the only copy of rendering metadata.

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

Treat a notification as a wake-up signal. Correlate its Assembly ID with the upload your server
authorized, then use the write-side SDK client to fetch and verify the receipt:

```ts
const receipt = await client.getStoredImageReceipt({
  assemblyId: upload.assemblyId,
  expected: { path: upload.path, size: upload.size, md5hash: upload.md5hash },
})
await saveImage({ ...receipt, ownerId: upload.ownerId })
```

Here `upload` is your trusted, server-side upload record, not an unchecked request body. The flow
is Uppy → store step → notification → `getStoredImageReceipt` → persist. The helper shares
`storeImage`'s exact one-original/path/size/MD5/asset_id validation and EXIF orientation handling.
For transformed or multiple inputs, correlate and validate the appropriate annotated result step
yourself. The helper deliberately handles one original only.

The same call recovers a local receipts-file failure: get the completed Assembly ID from the CLI
error or Console, supply the original file's trusted path/size/MD5, and append the returned receipt
to your saved app data. Do not rerun the write merely to recover metadata. Persist the complete
receipt with your owner/project ID; never persist a browser-supplied receipt without verification.

Read the saved receipt in an authorized Server Component and pass it as `src`:

```tsx
<StorageImage src={savedImage} alt={savedImage.description} layout="constrained" maxWidth={960} />
```

`savedImage` is the application's validated database record; the extra owner/asset/checksum fields
are not forwarded to CDN signing. Delivery resolves by path, not `asset_id` or checksum: those
fields do not pin bytes if you intentionally replace the path later. Prefer immutable paths.
The browser never needs the Assembly secret, Smart CDN secret, or a render-time metadata lookup.

### Credentials and framework adapters

`createTransloaditImage({ authKey, authSecret, workspace, images, public: ['website/'] })` supports
secret managers and multiple workspaces with the same flat options. The env factory snapshots only
the three rendering values on first use; it loads no files
and never falls back to Assembly credentials. All three factories, including
`createPrivateStorageImages`, accept a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.

“Native props” means serializable image attributes such as `alt`, `className`, `aria-*`, `data-*`,
`decoding` and `referrerPolicy`. Event callbacks and refs do not cross this Server Component
boundary. `src` and candidate URLs belong to the configured catalog and signing policy.
