# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go from Smart CDN to the
browser, never through Next's image optimizer. Sources are Storage paths or receipts, not URLs.

## Quickstart

**Unpublished, private dogfood:** use [local packages](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md) until release.
The published install will be `yarn add @transloadit/img && yarn add -D @transloadit/node`.
Use a Next.js 16 App Router app, React 19 and the default Node.js runtime (not Edge).

Run beside `package.json`, using an enabled Storage workspace with browser login and public-prefix support:

```bash
yarn transloadit auth login
yarn transloadit image init website/ --public --write-env
yarn transloadit storage store ./hero.jpg website/hero.jpg
yarn dev
```

Open `/storage-image-example`. Init creates the factory, an empty catalog and a page that displays
your first upload. Login opens browser approval; init reuses that credential without more prompts.
With `src/app`, source files go under `src/`; the catalog stays at the root:

```text
lib/storageImage.ts
app/storage-image-example/page.tsx
images.json                         # commit
.env.local                          # never commit; only with --write-env
```

Use the generated component anywhere in a Server Component:

```tsx
import { StorageImage } from '../lib/storageImage'
<StorageImage src="website/hero.jpg" alt="A canal house" layout="constrained" maxWidth={960} preload />
```

Catalog paths autocomplete. “Native props” means serializable attributes (`className`, `aria-*`,
`data-*`), not callbacks or refs. `preload` implies eager; other images default to native lazy loading.
[Auth Keys live in your workspace Console](https://transloadit.com/c/<workspace>/template-credentials/).


## Responsive

`layout` follows Astro's vocabulary, not the removed legacy `next/image` prop.

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
`fillcrop` at the box ratio, so a square avatar does not download an uncropped original.
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

## Private

Keep private uploads under a never-published directory such as `uploads/`. Removing `public` from
JavaScript does not revoke the server declaration or recall cached public bytes.
Use request-authorized redirects for private images on cached pages. Each uncached image load
invokes the app once to authorize a redirect; the image bytes still bypass it. The browser sends its native
same-origin session cookie; it cannot add a custom Bearer header. Replace the factory with:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import images from '../images.json'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createStorageImages({
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
entire workspace. Empty-string prefixes are rejected. Both delivery modes share the same flat options:
`images`, `allowedPathPrefixes`, `public`, `authorize`, `lifetime` and `route`.
Trusted `template`, `baseUrl` and `urlParams` overrides also work with authorization.
For your own sign-in or unavailable-image UI, use the optional `errorFallback` shown below.

### Mixed public and private images

Add `public: ['website/']` alongside `authorize` to share one factory. Published paths always emit
direct unsigned URLs, with zero application image requests; private paths still emit capabilities
and use the authorizer. Public prefixes must be inside the allowed directories, never the workspace
root. Local `public` is an assertion of server policy, not a substitute for publishing:

```bash
yarn transloadit storage publish website/
yarn transloadit storage public
yarn transloadit storage unpublish website/
```

Publishing is idempotent and requires `dam:write`. `image init website/ --public` performs that
publication before writing the factory; `storage store` never changes access policy.
Unpublishing stops uncached origin access. Cached or downloaded bytes cannot be recalled.

## When it breaks

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

An unsigned public HEAD returning 401/403 gets a `transloadit storage publish` hint. That status
alone cannot distinguish `NO_SIGNATURE_FIELD` from other denials. A 200 image response with
`immutable` confirms the public delivery/cache contract.
Other hints cover Smart CDN enablement, workspace/path/Template setup, expiry, clock and connectivity. A generic 403 cannot tell us
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

## Reference

### Login and credentials

`auth login` creates a short-lived device authorization, prints its code and verification URL,
opens your browser and polls until you approve the workspace. `--no-browser` only skips the
browser launch. Ctrl-C cancels polling without saving anything. Secrets never pass through the
browser URL or a localhost callback.

The approved **[Auth Key](https://transloadit.com/c/<workspace>/template-credentials/)** supports
Assemblies/Storage writes and Smart CDN. Enable Smart CDN on existing keys used for private
rendering; signing still requires that setting. Accounts may keep a separate rendering key:
`TRANSLOADIT_SMART_CDN_KEY/SECRET` override the pair, not individual missing fields.

Login saves `TRANSLOADIT_WORKSPACE`, `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` in
`~/.transloadit/credentials` with owner-only permissions. A shell `TRANSLOADIT_CREDENTIALS_FILE`
override is supported; project dotenv cannot redirect newly authorized credentials.
Existing credentials require `--replace`; app env files and symlinks are refused.
`auth login --stdin` retains automation with dotenv input (workspace optional, but needed by init),
verifying one signed Template read. Never pass secrets as CLI arguments.
The login also saves its API signing algorithm. For combined keys this is SHA-256; the CLI uses
it for subsequent API requests. With `--stdin`, include `TRANSLOADIT_SIGNATURE_ALGORITHM=sha256`
for such a key. Existing credentials without this value retain the SDK's SHA-384 default.

`image init --write-env` reads the login file explicitly, keeping its key, workspace and endpoint
together even if the shell or project contains older credentials. It creates an owner-only `.env.local`, never
overwriting it or prompting for another key. Omit it to leave env files untouched.
All keys are **server-only**, never `NEXT_PUBLIC_`. Public-only rendering needs just the workspace
slug (or explicit `workspace`); it never reads or validates signing credentials. Private capability
prerenders need a build-time secret; request-only direct rendering can defer it to runtime.
Supply the same private credentials to the deployed route handler.

CLI lookup is shell environment, current-directory `.env`, then the credentials file.
Ordinary commands retain this order: remove stale credential overrides before uploading to the
new login's workspace. Login and `init --write-env` do not overwrite those settings.
Login uses production unless `--endpoint` selects an explicit trusted API origin; this binding is
saved alongside the credential. Ordinary commands honor `TRANSLOADIT_ENDPOINT` under the same
lookup rules. Rendering never loads CLI credential files. The Assembly client is an upload-side
dependency, not part of rendering or the browser.

Init detects `app/` or `src/app/` and checks existing files before publishing. If a later local
write fails after publication, it reports that the prefix remains public. Do not unpublish shared
directories merely to retry a local scaffold. For manual setup, import the catalog into
`createStorageImages({ images, public: ['website/'] })`; `src/lib` imports the root catalog from
`../../images.json`. See [local dogfood](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md)
for trusted devdock endpoint overrides and the required CDN acknowledgment.

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
cache key. Private expiry/signature rotation creates new cache entries (30 minutes by default).
Public URLs have no signature or expiry. With a receipt MD5, `v` is its first 16 hex digits and
responses use `public, max-age=31536000, s-maxage=31536000, immutable`. Changed bytes plus a refreshed
catalog change the cache key. Without an MD5, no version is invented: the public Built-in uses its
ordinary three-day browser/one-day shared cache policy. Production Bunny cache hits/cost are a
separate deployment check, not something the local browser fixture establishes.

### Direct delivery for request-authorized galleries

Select `delivery: 'direct'` explicitly for request-rendered private delivery. It can reduce
application requests for galleries whose page data is already authorized:

```ts
export const { StorageImage } = createStorageImages({
  allowedPathPrefixes: ['website/'],
  delivery: 'direct',
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
There are no `previousTemplates` options or time-window chores for consumers. This unpublished
factory consolidation requires a one-time consumer update/rebuild; it is not a compatibility
promise for earlier experimental exports.

An explicitly configured `template` is bound to the capability. Coordinate custom Template changes
with a cached-markup rebuild. Payload-contract changes also require a capability-version bump and
rebuild; ordinary Built-in updates do not. Rotating the signing secret invalidates existing
capabilities. Already-issued or cached CDN grants remain usable until their own expiry.
Public pinned Built-ins must remain served while their permanent URLs are in circulation; coordinate
backend migrations before retiring a version. The SDK never retires server Templates.
Opaque capabilities use server-side AES-GCM-SIV from `@noble/ciphers` for deterministic safe sealing.

One factory owns both modes. Omitting `public`, `authorize` and `delivery: 'direct'` throws;
a catalog or prefix is not an authorization decision. `authorize` adds `storageRoute` to the result.


### Format, width and lifetime policy

Private delivery pins `builtin/storage-preview@0.0.2`; public delivery pins
`builtin/public-preview@0.0.1`. AVIF quality 45 and WebP quality
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
proportions in encoded candidates. AVIF/WebP/PNG candidates use `bg: '#00000000'` to preserve
transparency through both preview and encoding; JPEG uses an opaque background, white by default.
`fallbackBackground="#224466"` changes only the JPEG background (six RGB hex digits, or eight RGBA
digits ending in `ff`). Named colors and transparent JPEG backgrounds are rejected before signing.
Pass raw hex colors: URL signing encodes `#` as `%23`. `bg` cannot be overridden through global
`urlParams`. A custom Template must support the same background field contract.
`formats` sets per-format quality; `fallbackQuality` sets JPEG quality.
`template` overrides only private previews; `publicTemplate` independently overrides public
delivery and must accept unsigned requests with the same fields. A private Built-in cannot serve
as a public override, even when its input directory is published.

`lifetime` is a **private-grant maximum**, in milliseconds or a duration such as `'1h'`.
It defaults to one hour and cannot exceed 48 hours, including in mixed factories. Public URLs
ignore lifetime and rotation and never need an expiry-driven rebuild.
Private rotation defaults to half the lifetime, capped at one hour. The default grant therefore
has 30–60 minutes remaining, never 60–120. `rotationIntervalMs` cannot exceed half the private
lifetime, preserving a delivery margin; smaller buckets reduce variation but fragment the cache.

Without `errorFallback`, HTTP failure uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery. `deferUntilHydrated` is an opt-in delay for noncritical images;
leave it off unless addressing an observed browser replay issue.

### Receipt integrity and recovery

The store command wraps `client.storeImage()`, waits for completion and validates `asset_id`,
exact path, byte count, MD5 and positive EXIF-oriented display dimensions. The receipt lands in
`results[':original']`, not `results.stored`. Rendering requires no metadata lookup.

The CLI atomically appends to the JSON object keyed by Storage path, preserving earlier receipts
on failure. Parent directories must exist. A sibling lock prevents concurrent writers from losing
each other's records; remove an interrupted process's lock only after confirming it has stopped.
New catalogs use ordinary file permissions derived from your umask; existing modes are preserved.
The credentials file remains private (`0600`).
Receipt validation occurs after the Storage write, not as a rollback. A failed receipt may mean
the object already exists. Existing paths conflict by default.

`storage ls website/` lists the current workspace using its read-scoped Auth Key and the existing
S3-compatible read API, without an Assembly. `--workspace` overrides automatic workspace discovery.
S3 allows 30 seconds to receive headers and at most two attempts per request. A 60-second deadline
also covers retries and response-body reads; failed syncs release the catalog lock and leave the
existing catalog intact.
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
Sync preserves an existing `asset_id` and `size` only when the HEAD MD5 matches the saved hash.
Otherwise it replaces that entry with rendering metadata, so stale upload evidence is not retained.

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
Failed Assemblies retain their `ApiError` code, such as `TRANSLOADIT_STORE_CONFLICT`. An unfinished
Assembly raises `InconsistentResponseError` naming its current status; retry recovery after it
finishes. A completed Assembly with mismatched receipt data remains an integrity error.

The same call recovers a local receipts-file failure: get the completed Assembly ID from the CLI
error or Console, supply the original file's trusted path/size/MD5, and append the returned receipt
to your saved app data. Do not rerun the write merely to recover metadata. Persist the complete
receipt with your owner/project ID; never persist a browser-supplied receipt without verification.

Read the saved receipt in an authorized Server Component and pass it as `src`:

```tsx
<StorageImage src={savedImage} alt={savedImage.description} layout="constrained" maxWidth={960} />
```

`savedImage` is the application's validated database record; owner and asset IDs are never forwarded. A public receipt MD5 contributes only the `v` cache tag;
private signing omits it. Delivery resolves the current path. The cache tag is not an origin version selector: even with
`v`, a cold request for an overwritten path can retrieve new bytes. Prefer immutable paths.
The browser never needs the Assembly secret, Smart CDN secret, or a render-time metadata lookup.

### Credentials and framework adapters

`createStorageImages({ authKey, authSecret, workspace, images, public: ['website/'] })` supports
secret managers and multiple workspaces with the same flat options. The env factory snapshots only
the workspace and private signing pair on first use; it loads no files and uses the login key names
unless the complete Smart CDN override pair is supplied. The factory accepts a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.

“Native props” means serializable image attributes such as `alt`, `className`, `aria-*`, `data-*`,
`decoding` and `referrerPolicy`. Event callbacks and refs do not cross this Server Component
boundary. `src` and candidate URLs belong to the configured catalog and signing policy.
