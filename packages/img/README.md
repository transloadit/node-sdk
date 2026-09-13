# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go from Smart CDN to the
browser, never through Next's image optimizer. Sources are Storage paths or receipts, not URLs.

## Quickstart

**Unpublished, private dogfood:** use [local packages](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md) until release.
The published install will be `yarn add @transloadit/img && yarn add -D @transloadit/node`.
Use a Next.js 16 App Router app, React 19 and the default Node.js runtime (not Edge).

Run beside `package.json`, using an enabled Storage workspace:

```bash
yarn transloadit auth login
yarn transloadit image init website/ --public --write-env
yarn transloadit storage store ./hero.jpg website/hero.jpg
yarn dev
```

Open `/storage-image-example`. Init creates the factory, an empty catalog and a page that displays
your first upload. With `src/app`, source files go under `src/`; the catalog stays at the root:

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

## Private

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

## Reference

### Credentials and writes

`auth login` saves an **[Assembly Auth Key](https://transloadit.com/c/<workspace>/template-credentials/)** to `~/.transloadit/credentials` (or the explicit
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

Rendering uses a **[Smart CDN Auth Key](https://transloadit.com/c/<workspace>/template-credentials/)** from the same workspace. The server separates the two
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

Init never overwrites files. `--write-env` prompts for `TRANSLOADIT_WORKSPACE`,
`TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET`; `--stdin` accepts those in dotenv
format. Never use `NEXT_PUBLIC_`. Omit `--write-env` if your environment supplies the values.
For manual setup, import the catalog into `createStorageImages({ images, public: ['website/'] })`.
With `src/lib`, import the root catalog from `../../images.json`.


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
There are no `previousTemplates` options or time-window chores for consumers.

An explicitly configured `template` is bound to the capability. Coordinate custom Template changes
with a cached-markup rebuild. Payload-contract changes also require a capability-version bump and
rebuild; ordinary Built-in updates do not. Rotating the signing secret invalidates existing
capabilities. Already-issued or cached CDN grants remain usable until their own expiry.

One factory owns both modes. Omitting `public`, `authorize` and `delivery: 'direct'` throws;
a catalog or prefix is not an authorization decision. `authorize` adds `storageRoute` to the result.


### Format, width and lifetime policy

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
chooses a stable bucket no greater than half the effective private lifetime (at most 24 hours),
including in mixed public/private factories. This reserves at least half the lifetime for delivery;
smaller buckets reduce variation but fragment the CDN cache more. Public direct URLs use the
factory's captured time, so rebuild before they expire.
Without `errorFallback`, a 403/404 uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery. Opt-in `deferUntilHydrated` delays noncritical images; leave it
off unless addressing an observed WebKit replay issue.

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

`savedImage` is the application's validated database record; the extra owner/asset/checksum fields
are not forwarded to CDN signing. Delivery resolves by path, not `asset_id` or checksum: those
fields do not pin bytes if you intentionally replace the path later. Prefer immutable paths.
The browser never needs the Assembly secret, Smart CDN secret, or a render-time metadata lookup.

### Credentials and framework adapters

`createStorageImages({ authKey, authSecret, workspace, images, public: ['website/'] })` supports
secret managers and multiple workspaces with the same flat options. The env factory snapshots only
the three rendering values on first use; it loads no files
and never falls back to Assembly credentials. The factory accepts a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.

“Native props” means serializable image attributes such as `alt`, `className`, `aria-*`, `data-*`,
`decoding` and `referrerPolicy`. Event callbacks and refs do not cross this Server Component
boundary. `src` and candidate URLs belong to the configured catalog and signing policy.
