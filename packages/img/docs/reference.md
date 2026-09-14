# Storage images reference

Start with the [Quickstart](../README.md). This reference covers policy, advanced layouts and operations.

## Responsive

The `constrained` and `fixed` layout names follow Astro; `fill` follows Next.js.

`width={960}` on a catalog path or receipt derives proportional responsive CSS, the
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
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  layout="fill"
  fit="cover"
  aspectRatio="9/16"
  sizes="100vw"
/>
```

Fill with `aspectRatio` emits a positioned container with that ratio and crops to match it.
Use `frame={false}` when your application already owns the box, matching its CSS to the crop.
Fill without a ratio requires an already-sized, positioned parent; cover always needs the ratio.
All layout modes preserve explicit `sizes`, `widths`, `style` and `objectFit` overrides. Source
and backend limits still apply. `widths` overrides even the constrained mode's default 2× cap.
`layout="none"` retains presentation-only width/height; its encoding strategy stays `pad`.

For different mobile and desktop crops, pass width breakpoints in priority order and a default:

```tsx
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  layout="fill"
  fit="cover"
  aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}
  sizes="(min-width: 960px) 960px, 100vw"
  priority
/>
```

The same map sizes the emitted container; no duplicate responsive CSS is needed. Each breakpoint gets
real `fillcrop` candidates and its own JPEG fallback; preloads select only the matching crop.
Use up to eight `(min-width: …)` or `(max-width: …)` conditions with px, em or rem. No oversized
viewport-width arithmetic is needed. Receipts always supply intrinsic signing geometry;
separate `width`/`height` props describe presentation, even without fixed layout. One presentation
dimension derives the other proportionally.

## Mixed public and private images

Spread the committed catalog alongside `authorize` to share one factory. Published paths always emit
direct unsigned URLs, with zero application image requests; private paths still emit capabilities
and use the authorizer. Public prefixes are also allowed prefixes when no explicit `allowedPathPrefixes` is supplied,
including for an empty catalog. An explicit allowed policy still bounds public prefixes; the workspace
root cannot be declared public. CLI commands maintain `public` in `transloadit.images.json` after
updating server policy; do not edit that field manually:

```bash
npx transloadit storage publish website/
npx transloadit storage publications
npx transloadit storage unpublish website/
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
These messages contain no requested path, URL or secret. Set `basePath` explicitly in the factory
if your Next.js app uses one; no internal Next environment variable is consulted.
Private direct delivery logs once per factory that it makes the route dynamic; public direct does not.

An unsigned public HEAD with `Transloadit-Error: NO_SIGNATURE_FIELD` (HTTP 400) gets a
`transloadit storage publish` hint. Other HTTP 400 responses receive generic endpoint/Template
advice; 404 points to the workspace, path or Template. Older API versions without the header get
the generic hint, not an inferred publication diagnosis. A 200 image response with
`immutable` confirms the public delivery/cache contract.
Other hints cover Smart CDN enablement, workspace/path/Template setup, expiry, clock and connectivity. A generic 403 cannot tell us
which of those is wrong. Neither raw responses, errors, signed URLs nor secrets are logged.
The probe can trigger one cold transformation in development; it does not weaken authorization.

```tsx
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  width={960}
  errorFallback={<p role="status">Image unavailable</p>}
/>
```

This optional small client boundary keeps the exact server-rendered picture and replaces it only
after a failed native image load, including one completed before hydration. It adds no wrapper
element or retry loop. A changed source remounts the boundary. For a same-page sign-in followed
by `router.refresh()`, the **experimental** `retryKey` option accepts a non-secret session identity, for example
`retryKey={user?.id ?? 'anonymous'}`. The refreshed Server Component then resets a failed image
even though its redirect URL has not changed. A deliberate retry counter also works. Refreshing
alone does not reset a stable failed boundary, and unchanged keys never cause retry loops.
With no JavaScript, native image
failure behavior remains. A cross-origin browser error cannot identify the HTTP failure reason.
This is separate from `suspenseFallback`, which handles pending server signing, and from JPEG
format fallback, which does not recover failed AVIF/WebP requests.


### Login and credentials

`auth login` creates a short-lived device authorization, prints its code and verification URL,
opens your browser on macOS/Linux and polls until you approve the workspace. On Windows, open the
printed URL. `--no-browser` only skips the
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
`auth status` prints the saved workspace and key description without secrets. `auth logout`
revokes a browser-login key before removing the credentials file, ignoring stale shell/project
keys. Applications using that same key stop working too. Imported (`--stdin`) and legacy keys
are only forgotten locally; use `auth logout --revoke` to explicitly revoke those shared keys.
If revocation fails, the file remains so you can retry. `DELETE /auth_keys/self` identifies
the signing key on the server; no stored key ID or broad key-management scope is needed.
Revocation propagates through API caches asynchronously; logout is not an instantaneous global
cutoff. `--no-revoke` is rejected without changing the key or credentials file.
After saving, login makes one bounded signed `GET /storage/public_prefixes` to verify `dam:write`
and catalog access without publishing anything. Failure preserves the login and prints a Console
link plus a retry command. Success does not prove worker/object-store upload availability.
`auth login --stdin` retains automation with dotenv input (workspace optional, but needed by init),
verifying one signed Template read. Never pass secrets as CLI arguments.
The login also saves its API signing algorithm. For combined keys this is SHA-256; the CLI uses
it for subsequent API requests. With `--stdin`, include `TRANSLOADIT_SIGNATURE_ALGORITHM=sha256`
for such a key. Existing credentials without this value retain the SDK's SHA-384 default.
Unrestricted keys (`signature_algo: null`) also retain that default for API requests.

`image init` requires `--public` or `--private` and prefers the saved login, keeping its key,
workspace and endpoint together even with stale shell/project credentials. The catalog carries
`{ workspace, public, images }`; public init creates no app env file. Private `--write-env` creates
an owner-only `.env.local` containing only key and secret, never overwriting it. Omit that flag to
leave env files untouched. All keys are **server-only**, never `NEXT_PUBLIC_`.
Private initialization preserves already-published directories; it does not unpublish them.
The generated example selects a receipt in the initialized directory, or shows the empty state.
Public-only rendering reads workspace and policy from the catalog, not signing credentials. Private capability
prerenders need a build-time secret; request-only direct rendering can defer it to runtime.
Supply the same private credentials to the deployed route handler.

CLI lookup is shell environment, current-directory `.env`, then the credentials file.
Ordinary commands retain this order. Storage commands print the selected credential source to
stderr before operating, including mixed shell/project credentials and any declared workspace.
A declared env workspace is not proof of key ownership. Storage commands verify it through one
read for env/legacy keys or use the workspace verified during device login. A mismatch stops the
operation: `Project uses <slug>; the selected credentials belong to <other>. Nothing uploaded.`
`--workspace` explicitly selects another workspace but never mixes its records into the existing
catalog; use `--receipts` with a separate file. Login/init do not overwrite shell/project settings.
Login uses production unless `--endpoint` selects an explicit trusted API origin; this binding is
saved alongside the credential. Ordinary commands honor `TRANSLOADIT_ENDPOINT` under the same
lookup rules. Rendering never loads CLI credential files. The Assembly client is an upload-side
dependency, not part of rendering or the browser.

Init detects `app/` or `src/app/` and checks existing files before publishing. If a later local
write fails after publication, it reports that the prefix remains public. Do not unpublish shared
directories merely to retry a local scaffold. For manual setup, import the catalog into
`createStorageImages(catalog)`; `src/lib` imports the root catalog from
`../../transloadit.images.json`. See [local dogfood](https://github.com/transloadit/node-sdk/blob/img-onboard/docs/img-dogfood.md)
for trusted devdock endpoint overrides and the required CDN acknowledgment.

## Redirect lifetime and caching

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
loads for delayed reauthorization, opt in with `cacheMaxAge: '30s'`. The `307` uses
`private, max-age=30` (HTTP seconds), capped at the rotation interval and signed lifetime. Errors
remain `no-store`. Cached redirects may grant access without a new app check until that age elapses.
CDN URLs already issued remain usable until their own expiry; downloaded bytes cannot be recalled.

After a directory is published, old private capabilities can redirect to its unsigned public URL.
These compatibility redirects share-cache for at most one minute: their request URL has no receipt
hash, so a longer cache could retain an old versioned target after an overwrite and catalog refresh.
New public markup uses direct versioned CDN URLs and does not take this compatibility route.

Production Smart CDN uses Bunny for `*.tlcdn.com`: hostname and the whole query string form the
cache key. Format-specific URLs avoid unkeyed Accept negotiation. A representative constrained
hero has roughly 140-character URLs × 11 image candidates (five AVIF, five WebP, one JPEG), plus
five preload candidates. Rendering `my-app/website/hero.jpg` (2400×1600, display width 960) measured
3,174 bytes: **~3 KB of uncompressed HTML**, depending on path and attributes.
That is markup overhead, not transferred image bytes; compression and full-page RSC data vary. Private expiry/signature rotation creates new cache entries (30 minutes by default).
Public URLs have no signature or expiry. They are cache-busted, not immutable origin identities:
an old uncached URL can fetch new bytes after a path overwrite. Prefer immutable filenames.
With a receipt MD5, `v` is its first 16 hex digits and
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
has 30–60 minutes remaining, never 60–120. `rotationInterval` cannot exceed half the private
lifetime, preserving a delivery margin; smaller buckets reduce variation but fragment the cache.

`cacheMaxAge` and `rotationInterval` accept milliseconds or the same strings as `lifetime`, for
example `'1m'` and `'30m'`. `cacheMaxAgeMs` and `rotationIntervalMs` are deprecated numeric aliases;
do not supply both spellings. In development, an image without explicit `sizes` warns if its
chosen candidate exceeds twice its rendered CSS width; production does no size diagnostics.

Without `errorFallback`, HTTP failure uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery.

### Experimental browser recovery controls

`retryKey` is experimental, retained for the native-cookie sign-in recovery browser fixture.
Prefer the native behavior or `errorFallback` alone unless a
same-page sign-in/refresh needs an explicit retry identity. See [When it breaks](#when-it-breaks).

### Receipt integrity and recovery

The store command wraps `client.storeImage()`, waits for completion and validates `asset_id`,
the exact destination, stored byte count/MD5 and positive EXIF-oriented display dimensions.
The receipt lands in `results[':original']`, not `results.stored`. Older deployments can apply
Community-plan watermarks before Storage runs; newer API2 deployments preserve stored originals.
The receipt describes the stored bytes, not an assumption that they equal the local file.
The CLI warns about a changed size or checksum and saves that authoritative receipt normally.
`--log-level debug` adds the Assembly ID, bounded receipt summary and input comparison, never
raw Assembly responses or credentials. SDK callers can observe `(receipt, input, assemblyId)`
through the optional `onReceipt` callback. Observers are not awaited; synchronous exceptions and
asynchronous rejections do not discard completed writes.
Rendering requires no metadata lookup.

`storage store ./images/*.jpg website/` accepts shell-expanded files and a directory destination.
Each successful upload is checkpointed before the next; a later failure preserves earlier receipts.
Duplicate destination basenames are refused before uploading. The printed snippet uses a
decorative empty alt with a reminder to describe informative images.

The CLI atomically appends to the catalog's `images` object keyed by Storage path, preserving earlier receipts
on failure. Parent directories must exist. A sibling lock prevents concurrent writers from losing
each other's records. Ctrl-C cancels active uploads and S3 reads, releases the lock, and checkpoints
any receipt that already returned before stopping. An accepted Assembly may still finish remotely:
check Storage or sync receipts before retrying a write. A forced exit or crash can leave a lock;
remove it only after confirming the writer has stopped.
New catalogs use ordinary file permissions derived from your umask; existing modes are preserved.
The credentials file remains private (`0600`).
Receipt validation occurs after the Storage write, not as a rollback. If no usable receipt comes
back, inspect with `storage ls` and recover with `storage receipts sync`, using the same catalog.
Do not re-upload or use `--overwrite` to fix missing metadata. Existing paths conflict by default.

`storage ls website/` lists the current workspace using its Auth Key with `read` or `dam:write` scope and the existing
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
npx transloadit storage receipts sync website/
```

This uses paginated List + HEAD with the same `read` or `dam:write` credentials, `--workspace` and
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
Commit `transloadit.images.json` before building so rendering needs no runtime metadata lookup; it can now
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
is Uppy → store step → notification → `getStoredImageReceipt` → persist. The helper validates
one original, its exact path/asset_id and EXIF-oriented dimensions. Unlike the result of a write
initiated by `storeImage`, recovery from a separate Assembly ID also requires a size/MD5 match
with your trusted upload record. Community-plan watermarks can break that byte-identity check.
For transformed or multiple inputs, correlate and validate the appropriate annotated result step
yourself; do not replace trusted expectations with unchecked notification fields.
Failed Assemblies retain their `ApiError` code, such as `TRANSLOADIT_STORE_CONFLICT`. An unfinished
Assembly raises `InconsistentResponseError` naming its current status; retry recovery after it
finishes. A completed Assembly with mismatched receipt data remains an integrity error.

The same call recovers a local receipts-file failure: get the completed Assembly ID from the CLI
error or Console, supply the original file's trusted path/size/MD5, and append the returned receipt
to your saved app data. Do not rerun the write merely to recover metadata. Persist the complete
receipt with your owner/project ID; never persist a browser-supplied receipt without verification.

Read the saved receipt in an authorized Server Component and pass it as `src`:

```tsx
<StorageImage src={savedImage} alt={savedImage.description} width={960} />
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
