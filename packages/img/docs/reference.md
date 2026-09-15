# Storage images reference

Start with the [Quickstart](../README.md). This reference covers policy, advanced layouts and operations.

## Next.js plugin and catalog convention

`StorageImage` from `@transloadit/img/next` is an App Router Server Component. Wrap the existing
Next config with `withTransloaditImages(nextConfig)` from `@transloadit/img/next/config`.
The plugin binds `transloadit.images.json` and optional `transloadit.authorize.ts` from the app
root using build-time aliases for Turbopack and webpack, and adds narrow output tracing includes.
It preserves existing aliases, tracing rules and webpack hooks. Restart dev after first adding
the authorizer; ordinary catalog edits participate in the bundler's dependency graph.
The wrapper returns Next's phase-aware config function; make it the outer wrapper when composing
with plugins that accept only config objects. Generation runs in dev/build, never at `next start`:
the compiled app does not need the source catalog or generation cache to remain on disk.

This first cut requires the plugin. There is no cwd-based runtime fallback: bundlers and deployment
hosts differ in which files they trace and where they start a process. The packed fixture verifies
local `next build` + `next start`, with Cache Components enabled and omitted. Hosted Vercel,
other serverless adapters and Edge are not claimed as verified; Edge is unsupported.

```ts
import { withTransloaditImages } from '@transloadit/img/next/config'

export default withTransloaditImages({}, {
  catalog: 'assets/transloadit.images.json',
  // Set root: import.meta.dirname when starting Next from a monorepo parent directory.
  delivery: {
    baseUrl: 'https://my-storage-api.example/file/{workspace}',
    urlParams: { cdn: 'required' },
  },
})
```

Catalog overrides must remain inside the app root. The plugin's generated options under
`node_modules/.cache/transloadit-images/` contain only nonsecret transport/basePath settings, never a
second catalog or an application key. Its build-time delivery override wins over catalog delivery.
Rebuild after changing transport, private authorization or deployment keys for prerendered pages.

`storage store` creates the catalog on first use and updates it after each successful upload.
Run beside `package.json`, or select a catalog explicitly with `--receipts`. The catalog contains
workspace, server-declared public prefixes and image receipts. A non-production login also writes:

```json
{
  "delivery": {
    "baseUrl": "http://127.0.0.1:3020/file/{workspace}",
    "urlParams": { "cdn": "required" }
  }
}
```

This is a field within the catalog, not a standalone catalog. Production logins omit it.
Later writes preserve an existing delivery choice; remove that block deliberately to return to
production Smart CDN. Neither the catalog nor declarations contain login credentials.

### Generated types and optional scaffolding

CLI catalog writes also derive `transloadit-images.d.ts` beside the catalog. Commit both files.
Its augmentation of `RegisteredStorageImages` in `@transloadit/img/next` gives `src` exact path
completion and retains each source's width/height. Next's stock TypeScript include discovers it;
include the declaration explicitly if your app uses restrictive includes. Without it, `src` is
`string` and runtime geometry still comes from the JSON. The declaration is metadata, never a
second runtime source. Recovery regenerates it without another upload.

Use one conventional catalog per app. For several catalogs, keep their explicit
`createStorageImages(catalog)` factories and inferred JSON keys instead of combining generated
global declarations. Factories do not require the plugin. They also understand catalog delivery;
explicit top-level `baseUrl`/`urlParams` override that block.

`image init website/ --example` remains an optional page generator using the same package import
as the README, without `lib/storageImage.ts` or a second factory. It uses an existing
catalog without login or publication, preserving its workspace and delivery. A saved development
login cannot redirect that existing catalog; only an explicit `--endpoint` changes its transport.
Credentialed init (publication or `--write-env`) requires matching login/delivery origins; otherwise
it refuses before any write. Select matching credentials or a separate catalog, or deliberately
switch delivery with `--endpoint`. Custom CDN overrides can stay in the Next config plugin instead.
`image init uploads/ --private` creates only the conventional
authorizer and route below; add `--example` for a page too. The older `image init --public` is an
explicit publication plus example shortcut, not a prerequisite. No existing source file is overwritten.
Package-import scaffolding requires a catalog inside the Next.js app; external catalogs are refused
before writing files or publishing. Use an explicit `createStorageImages` factory for shared catalogs
outside the app instead.

## Responsive

`preload` is this component's hero macro: eager loading, a responsive preload and high fetch priority.
Unlike Next.js 16's preload flag (which adds a preload link), it intentionally sets all three.
Next deprecates priority in favor of preload; our `priority` alias remains for one release and
warns only in development. Do not combine either with lazy loading. Explicit eager `sizes="auto, …"`
uses the fallback lengths without `auto`, with a development warning; bare `auto` falls back to 100vw.
Other images default to native lazy loading. Props are serializable native attributes, not callbacks or refs.

`placeholder="blur"` uses the receipt's optional base64 `thumbhash`. `storage store` and
`client.storeImage()` generate it from the checksum read using pinned [ThumbHash](https://github.com/evanw/thumbhash)
and Sharp, EXIF-oriented and at most 100×100 pixels. Encoding is best-effort: originals over
32 MiB, over 40 million pixels, unsupported formats or a two-second decoder timeout omit it.
Origin-side byte changes also omit the hash, since the local preview would no longer match.
The Server Component decodes the hash; the ThumbHash decoder never enters the client bundle.
Sharp is an optional SDK dependency; an unavailable local decoder omits this metadata without
blocking the Storage write. Storage writes also record `hasAlpha: true` only when the original has an alpha channel, even if
all its pixels happen to be opaque. For those images blur is a no-op with the development-only
note "transparent image: no blur placeholder". An alpha-encoded hash also suppresses blur when
the receipt flag is missing. For images without alpha, the background remains in place, hidden
under the loaded opaque image: no client-side load handler is needed or shipped.
Blur requires a box-filling image: the default constrained layout, or `object-fit: fill` / `cover`.
Letterboxed `contain`, `none` and `scale-down` images omit it with a development note, since the
approximate ThumbHash ratio could otherwise leave a permanent blurred band beside the image.
Each blur adds up to about 6 KB of inline PNG/base64 markup before HTML compression; opt in only
where the loading preview is worth that extra HTML. Your CSP must allow `img-src data:` (alongside
your normal image sources) for the placeholder to display.
Without a usable hash, the prop is a no-op with a development-only note. Request-authorized
private redirects also omit it: embedding blurred private pixels would expose them before the
image request's authorization check. Direct delivery is only for already-authorized page data.
Receipts sync performs no original download and cannot create a missing ThumbHash.
ThumbHashes contain a recognizable preview, not just a checksum. Keep catalogs for private images
in private source control, or remove their `thumbhash` fields before sharing the catalog publicly.

The `constrained` and `fixed` layout names follow Astro; `fill` follows Next.js.

The pinned public Built-in caps both output dimensions at 4096 pixels, including crops and JPEG
fallbacks; the SDK scales its candidate ladder accordingly. Explicit public quality above 85 is
rejected before rendering. Private previews retain their 8000-pixel / quality-100 limits.

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
  preload
/>
```

The same map sizes the emitted container; no duplicate responsive CSS is needed. Each breakpoint gets
real `fillcrop` candidates and its own JPEG fallback; preloads select only the matching crop.
Use up to eight `(min-width: …)` or `(max-width: …)` conditions with px, em or rem. No oversized
viewport-width arithmetic is needed. Receipts always supply intrinsic signing geometry;
separate `width`/`height` props describe presentation, even without fixed layout. One presentation
dimension derives the other proportionally.

## Private

Keep private uploads in a never-published directory such as `uploads/`. Removing a JavaScript
public declaration does not revoke server policy or recall cached bytes. Create the separate
application key described in [Login and credentials](#login-and-credentials), not the CLI login key.
Set that pair in both the host's server-only build and runtime environments, never as `NEXT_PUBLIC_`.

```ts
// transloadit.authorize.ts, beside next.config.ts
import type { AuthorizeTransloaditStorageImage } from '@transloadit/img/next/server'
import { authenticate, canReadStorageObject } from './lib/authorization'

export const authorize: AuthorizeTransloaditStorageImage = async ({ path, request }) => {
  const user = await authenticate(request)
  return user !== null && (await canReadStorageObject(user, path))
}
```

`request` is a standard Web `Request`; read the browser's native cookie through your session library.
Export in `app/api/storage-images/route.ts` (prefix source paths with `src/` if your app uses it):

```ts
export { GET, HEAD } from '@transloadit/img/next/route'
```

The default route is `/api/storage-images`; denied requests return `404`. Each uncached private
image load invokes the handler once. Conventional private redirects use private, no-store responses.
Downstream CDN grants have 30–60 minutes remaining by default and are usable
until expiry, independently of redirect caching. Image bytes always bypass the application.

`image init uploads/ --private` scaffolds those two files with fail-closed authorization, including
in an existing public project. It never overwrites application code. The optional `--write-env` copies the saved login key
for local testing only; replace it with the separate application key before deployment.
Public-only rendering never reads or validates signing credentials and needs no application env.

For custom routing or caching, keep the explicit factory escape hatch:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import catalog from '../transloadit.images.json'
import { authorize } from '../transloadit.authorize'

export const { StorageImage, storageRoute } = createStorageImages({ ...catalog, authorize, cacheMaxAge: '1m' })
```

Its route exports `storageRoute as GET, storageRoute as HEAD` from the application factory.
This optional minute of redirect caching delays reauthorization; omit it for private, no-store.

## Mixed public and private images

Spread the committed catalog alongside `authorize` to share one factory. Published paths always emit
direct unsigned URLs, with zero application image requests; private paths still emit capabilities
and use the authorizer. Public prefixes are also allowed prefixes when no explicit `allowedPathPrefixes` is supplied,
including for an empty catalog. An explicit allowed policy still bounds public prefixes; the workspace
root cannot be declared public. CLI commands maintain `public` in `transloadit.images.json` after
updating server policy; do not edit that field manually:

```bash
npx transloadit storage publish website/
npx transloadit storage publish website/ --dry-run
npx transloadit storage publications
npx transloadit storage unpublish website/
```

Publishing is idempotent and requires `dam:write`. `storage store ./hero.jpg website/hero.jpg --public`
declares the destination directory after checkpointing the upload. It prints the recursive
current-and-future publication boundary before changing it. If publication fails, the receipt
remains saved: retry with `storage publish website/`, not another upload. A root object cannot be
published with --public. Plain `storage store` never changes access policy.
`--dry-run` only lists current matching objects through the S3 read API; it never publishes or
changes the local catalog. Future objects under that prefix would also be public after publication.
Unpublishing stops uncached origin access. Cached or downloaded bytes cannot be recalled.

## When it breaks

In development only, the server performs one HEAD per unique path/Template per factory, with a
five-second timeout. The probe runs in the background and never holds up the image or redirect.
An opted-in development failure fallback shares that same result (origin/path only, no query) and
points at the terminal; it issues no additional HEAD. Production fallback output is unchanged.
Concurrent/repeated renders share that probe. Redirects probe only after
application authorization; disallowed prefixes fail before any request. Production performs no
diagnostic requests. Editing the factory configuration recreates its probes through Next.js Fast
Refresh; repeated requests to the unchanged factory do not retry a failed check automatically.

Denied redirect routes also emit one development-only hint per reason (and verified path for authorization): route/basePath mismatch,
invalid or stale capability (secret/Template changes), disallowed prefix, or failed authorization.
Malformed capabilities never reveal a requested path. After decoding a valid capability, denied
authorization names the catalog path and offers `storage publish` only if that image should be public;
it never changes policy. URLs, signatures and secrets are not logged. When the conventional catalog's
`public` policy changes during development, one server notice lists paths that now require the
private route and authorization. Unknown catalog keys name the path, suggest a close spelling, and
show a safely quoted `storage store` command. Set `basePath` explicitly in the factory
if your Next.js app uses one; no internal Next environment variable is consulted.
Private direct delivery logs once per factory that it makes the route dynamic; public direct does not.

An unsigned public HEAD with `Transloadit-Error: NO_SIGNATURE_FIELD` (HTTP 400) gets a
`transloadit storage publish` hint. Other HTTP 400 responses receive generic endpoint/Template
advice; 404 points to the workspace, path or Template. Older API versions without the header get
the generic hint, not an inferred publication diagnosis. A 200 image response with
`immutable` confirms the public delivery/cache contract.
If that path should be private, remove its stale public declaration from the catalog or factory
and configure private delivery; an authorization callback cannot gate a path still declared public.
Recovery commands target the default catalog unless you add `--receipts <catalog.json>` for your
custom catalog. With an explicit factory, update its images/public configuration as well.
The probe reads the `Transloadit-Error` code before choosing advice. `INSUFFICIENT_AUTH_SCOPE`
calls for `smart_cdn:sign`: edit the application key in Console → Credentials,
with Smart CDN enabled (`assemblies:write` is also accepted, but grants broader Assembly access). Other safe error-code
labels are included in the HEAD result. Only a 403 without a specific code leaves Smart CDN
enablement, workspace, secret, expiry and clock ambiguous. No response bodies, raw errors,
signed query strings or secrets are logged.
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
opens your browser on macOS/Linux/Windows and polls until you approve the workspace. Open the
printed URL manually if opening fails. Windows uses `cmd /c start ""` with a safely quoted URL and no
AutoRun/delayed expansion. `--no-browser` only skips the
browser launch. Ctrl-C cancels polling without saving anything. Secrets never pass through the
browser URL or a localhost callback. A browser denial stops polling immediately and saves nothing.
The approval page lets you sign up before choosing a workspace;
the code remains valid for 15 minutes while you verify your email and finish signup.

The approved **Auth Key** appears under the Console's
**[Credentials](https://transloadit.com/c/<workspace>/template-credentials/)** sidebar item and supports
Assemblies/Storage writes and Smart CDN. Existing keys used for private rendering also need
Smart CDN enabled and the `smart_cdn:sign` scope (`assemblies:write` is also accepted).

For private deployments, create a **separate application key** in Console → Credentials → New Auth Key
with Smart CDN on and the `smart_cdn:sign` scope (`assemblies:write` is also accepted).
The signing-only scope permits URL transforms, not standalone Assembly or Storage writes.
Set `TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET` in the host's
server-only build and runtime environment, using the same pair for the page and route handler.
If you also grant Assembly access and use that combined key with `new Transloadit()` from `@transloadit/node`, pass
`signatureAlgorithm: 'sha256'`: new Console-created combined keys use SHA-256, while the SDK keeps
its SHA-384 default for existing keys. The image component already signs Smart CDN URLs correctly.
`TRANSLOADIT_SMART_CDN_KEY/SECRET` override the pair, not individual missing fields. Keeping the
application key separate prevents a developer's logout from breaking deployed images: `auth logout`
revokes the browser-login key. Never deploy that disposable login identity as the application's key.

Login saves `TRANSLOADIT_WORKSPACE`, `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` in
`~/.transloadit/credentials` with owner-only permissions. A shell `TRANSLOADIT_CREDENTIALS_FILE`
override is supported; project dotenv cannot redirect newly authorized credentials.
Existing credentials are preserved: login prints their file path, saved workspace/description and
file modification date in UTC. Set `TRANSLOADIT_CREDENTIALS_FILE` to another file for a separate
login, or deliberately use `--replace`; app env files and symlinks are refused.
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

`image init` is optional: `--example` uses an existing catalog without credentials; publication or
initializing an empty project prefers the saved login, keeping key, workspace and endpoint together.
The catalog carries `{ workspace, public, images }` and optional non-production `delivery`.
`TRANSLOADIT_WORKSPACE` overrides the catalog workspace when explicitly set in the app's environment.
Remove a stale override if image URLs point at another workspace; the factory does not read the CLI's
saved credentials file. Private `--write-env` creates
an owner-only `.env.local` containing only key and secret, never overwriting it. Omit that flag to
leave env files untouched. All keys are **server-only**, never `NEXT_PUBLIC_`.
Private initialization preserves already-published directories; it does not unpublish them.
The generated example selects a receipt in the initialized directory, or shows the empty state.
Public-only rendering reads workspace and policy from the catalog, not signing credentials. Private capability
prerenders need a build-time secret; request-only direct rendering can defer it to runtime.
Supply the same private credentials to the deployed route handler.

CLI lookup is shell environment, current-directory `.env`, then the credentials file.
Ordinary commands retain this order. Storage commands print the selected credential source only
when a shell/project override wins, including mixed credentials and any declared workspace.
A declared env workspace is not proof of key ownership. Storage commands verify it through one
read for env/legacy keys or use the workspace verified during device login. A mismatch stops the
operation: `Project uses <slug>; the selected credentials belong to <other>. Nothing uploaded.`
`--workspace` explicitly selects another workspace but never mixes its records into the existing
catalog; use `--receipts` with a separate file. Login/init do not overwrite shell/project settings.
Login uses production unless `--endpoint` selects an explicit trusted API origin; this binding is
saved alongside the credential. Ordinary commands honor `TRANSLOADIT_ENDPOINT` under the same
lookup rules. Rendering never loads CLI credential files. The Assembly client is an upload-side
dependency, not part of rendering or the browser.

`auth login --endpoint <url>` persists that endpoint in the saved login. On first catalog creation,
store records `delivery.baseUrl: '<endpoint>/file/{workspace}'` and `urlParams: { cdn: 'required' }`
for non-production. Subsequent writes preserve an existing delivery block. Remove it, and any
explicit plugin/factory overrides, to switch to production Smart CDN. Public rendering stays
secretless and production derives the CDN host from the catalog workspace.
For a separate login, set `TRANSLOADIT_CREDENTIALS_FILE` in your shell before logging in.
Console → Credentials contains the key; follow its real workspace link printed by the CLI.

Init detects `app/` or `src/app/` and checks existing files before publishing. If a later local
write fails after publication, it reports that the prefix remains public. Do not unpublish shared
directories merely to retry a local scaffold. For manual setup, import the catalog into
`createStorageImages(catalog)`; `src/lib` imports the root catalog from
`../../transloadit.images.json`. See [local dogfood](https://github.com/transloadit/node-sdk/blob/img-onboard/docs/img-dogfood.md)
for trusted devdock endpoint overrides and the required CDN acknowledgment.

## Delivery overrides

CLI `--endpoint` (saved by login) and `TRANSLOADIT_ENDPOINT` select the Assembly/Storage API.
A new non-production catalog records that origin in its delivery block; existing blocks are
preserved. The plugin accepts an explicit delivery override. The equivalent factory escape hatch is:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import catalog from '../transloadit.images.json'

export const { StorageImage } = createStorageImages({
  ...catalog,
  baseUrl: 'https://api2-devdock.transloadit.dev/file/{workspace}',
  urlParams: { cdn: 'required' },
})
```

This example is for a trusted local devdock, not production configuration. `baseUrl` is the
delivery base before the Template and image path, with an optional `{workspace}` placeholder;
it must be an absolute HTTP(S) URL without credentials, query string or fragment. Direct API2
delivery requires the explicit `cdn: 'required'` acknowledgment. `urlParams` supplies transport
parameters; it cannot override image geometry, format, background, version or signing fields.
Never derive either option from browser input: a private delivery origin receives signed URLs.
Ordinary production delivery needs neither override and uses the workspace's Smart CDN hostname.

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
hash, so a longer cache could retain an old cache-tagged target after an overwrite and catalog refresh.
New public markup uses direct cache-tagged CDN URLs and does not take this compatibility route.

### Cache and markup cost

Production Smart CDN uses Bunny, configured on `*.tlcdn.com`: hostname and the whole query string
form the cache key. This is our pull-zone configuration, not universal Bunny behavior.
Format-specific URLs avoid unkeyed Accept negotiation. A representative constrained
hero has 11 image candidates (five AVIF, five WebP, one JPEG), plus five preload candidates.
The pinned Built-ins omit default JPEG format, quality 75, pad resizing and white background;
transparent formats retain their explicit background. Dimensions stay explicit. Custom Templates
keep all fields because their defaults are unknown; `cdn` is sent only when delivery configuration
sets it. This deliberately changes cache keys during unpublished dogfood. Markup overhead is not
transferred image bytes; compression and full-page RSC data vary. Private expiry/signature rotation
creates new cache entries (30 minutes by default).
Public URLs have no signature or expiry. They are cache-busted, not immutable origin identities:
an old uncached URL can fetch new bytes after a path overwrite. Prefer immutable filenames:
`storage store ./hero.jpg website/ --hashed` inserts the first eight hex digits of the input MD5
before the extension, for example `website/hero.fce9d56a.jpg`. The catalog key, generated types and
printed JSX use that name; the receipt's `source` keeps the original local filename for humans.
The same bytes at the same destination are a no-op when the same-workspace catalog has a verified
receipt with matching full MD5, size and API origin. Hashed receipts record `apiOrigin` so a dev
workspace cannot stand in for production just because their slugs match. A missing or different
origin stops the command; use a separate `--receipts` catalog for that environment.
Commit the catalog: without that evidence the CLI cannot
prove a remote conflict is the same object. Restore the receipt or choose another basename; a
short-hash collision is never overwritten. Changed bytes get a new name, so `--overwrite` is not
needed and cannot be combined with `--hashed`. Do not modify the input while uploading.
The `v` tag is then belt-and-braces; hashed naming does not change the origin's versioning contract.
`v` is a cache-busting tag derived from the receipt hash; the origin does not verify it, so a cold
request after an overwrite can return the replacement. With a receipt MD5 it uses the first 16 hex digits and
responses use `public, max-age=31536000, s-maxage=31536000, immutable`. Changed bytes plus a refreshed
catalog change the cache key. Without an MD5, no cache tag is invented: the public Built-in uses its
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
`builtin/public-preview@0.0.1`, which wraps `builtin/storage-preview@0.0.2`: the public URL pins
its transformation pipeline version too. AVIF quality 45 and WebP quality
75 precede a JPEG quality 75 fallback. Formats use separate URLs, not unkeyed Accept negotiation.
Candidate widths follow 320, 640, 960, 1280, 1920, 2560, 3840 plus intrinsic width, bounded by the
source and backend dimensions. `widths` overrides the ladder; the JPEG fallback is no larger than
its largest candidate. For a 48px avatar, `widths={[48, 96]}` also caps JPEG at 96px.

Explicit `sizes` describes CSS layout; it does not set that layout. Without a derived or explicit
size, lazy images default to `sizes="auto, 100vw"` (automatic CSS-box sizing where supported,
viewport fallback otherwise); eager/preloaded images retain `100vw`. Auto sizing is lazy-only:
Chrome 126+ and [Firefox 150+](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/150)
support it; Safari does not yet. Browsers without support use the listed fallback. Keep explicit fallback lengths.
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
do not supply both spellings. In development, an image without explicit `sizes` can warn when
its decoded, density-corrected width exceeds twice its rendered CSS width. Transient 0/1px boxes
are ignored; cached/HiDPI resolution alone does not trigger the hint. Production does no size diagnostics.

Without `errorFallback`, HTTP failure uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery.

### Experimental browser recovery controls

`retryKey` is experimental, retained for the native-cookie sign-in recovery browser fixture.
Prefer the native behavior or `errorFallback` alone unless a
same-page sign-in/refresh needs an explicit retry identity. See [When it breaks](#when-it-breaks).

### Receipt integrity and recovery

Older deployments may watermark Community-plan uploads. The CLI reports changed bytes and saves
metadata for the actual stored image; it does not suggest overwriting that completed upload.

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
Duplicate destination basenames are refused before uploading unless `--hashed` distinguishes them
by content (identical bytes reuse the first receipt, even during an explicit workspace override).
The printed snippet uses a
filename-derived alt; replace it with an accurate description, or an empty alt for a decorative image.

The CLI atomically appends to the catalog's `images` object keyed by Storage path, preserving earlier receipts
on failure. Parent directories must exist. A sibling lock prevents concurrent writers from losing
each other's records. Ctrl-C cancels active uploads and S3 reads, releases the lock, and checkpoints
any receipt that already returned before stopping. An accepted Assembly may still finish remotely:
check Storage or sync receipts before retrying a write. A forced exit or crash can leave a lock;
remove it only after confirming the writer has stopped.
New catalogs use ordinary file permissions derived from your umask; existing modes are preserved.
The credentials file remains private (`0600`).
Receipt validation occurs after the Storage write, not as a rollback. Do not re-upload or use
`--overwrite` to fix missing metadata. Existing paths conflict by default.
`storage store --overwrite` explicitly replaces an occupied path; it is never the default. Prefer
[hashed immutable filenames](#cache-and-markup-cost) because delivery resolves paths, not receipt
hashes, and cached bytes can outlive an overwrite. On older deployments that transform uploaded
bytes, the CLI still saves the authoritative receipt; a differing checksum makes a hashed replay
fail without uploading or replacing anything. Restoring that same transformed receipt cannot fix
the mismatch. Choose a fresh destination basename; hashed replay requires an origin that preserves
the uploaded bytes. The same refusal protects against a short-hash collision.

### Recovery (requires the Storage read API, not yet enabled in production)

If no usable receipt comes back, inspect with `storage ls` and recover with `storage receipts sync`,
using the same catalog. Until this API is enabled, restore the committed catalog or use the
[Assembly receipt recovery API](#images-uploaded-by-your-users) with trusted upload metadata.

`storage ls` and `storage receipts sync` require the S3 read API, currently off in production until
`API2_STORAGE_S3_ENABLED` is deployed. HTTP 403 cannot distinguish a disabled API from denied access;
check the endpoint and key scope before retrying.

`storage ls website/` lists the current workspace using its Auth Key with `read` or `dam:write` scope and the existing
S3-compatible read API, without an Assembly. `--workspace` overrides automatic workspace discovery.
S3 allows 30 seconds to receive headers and at most two attempts per request. A 60-second deadline
also covers retries and response-body reads; failed syncs release the catalog lock and leave the
existing catalog intact.
It uses the endpoint saved with those key credentials; `--endpoint` is an explicit trusted override
and accepts the API origin, not a bucket URL. The rendering factory's `baseUrl` is unrelated.
The Storage S3 API must be enabled separately: successful Assembly-based storage or image delivery
does not imply that listing is enabled. A disabled S3 API returns HTTP 403, even with valid credentials.

Recover or refresh a rendering catalog without re-uploading or downloading originals:

```console
npx transloadit storage receipts sync website/
```

This uses paginated List + HEAD with the same `read` or `dam:write` credentials, `--workspace` and
`--endpoint` options as `storage ls`. Sync also reads `GET /storage/public_prefixes` with `dam:write`
scope and commits server-declared public policy and receipts atomically. If policy cannot be read,
recovery fails without changing the existing file. Folder names never imply public access.
An empty server policy is recovered as `public: []`, not silently republished. For intentionally
public images run `storage publish` on the intended directory; otherwise configure `authorize`
for private delivery. The CLI and factory explain this missing delivery choice.
HEAD's `x-amz-meta-dam-width` and `x-amz-meta-dam-height`
rebuild `{ path, width, height }`, which can be passed directly as `StorageImage`'s `src`.
`md5hash` is included only for compatible single-part ETags; multipart, opaque and SSE-KMS/SSE-C
ETags are not treated as MD5. See [S3's ETag contract](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html).
HEAD does not expose `asset_id`: sync recovers rendering metadata, not a verified upload receipt.
Sync preserves an existing `asset_id`, `size`, `source`, `apiOrigin`, `thumbhash` and `hasAlpha` only when the HEAD MD5 matches
the saved hash. A fresh sync has no original bytes and cannot reconstruct ThumbHash or alpha metadata.
It cannot generate a ThumbHash from List + HEAD; fresh recovered receipts leave that field absent.
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

`savedImage` is the application's validated database record; owner and asset IDs are never forwarded.
A public receipt's `v` is a cache-busting tag derived from the receipt hash; the origin does not
verify it, so a cold request after an overwrite can return the replacement. Private signing omits
the tag. Prefer immutable filenames; see [upload/overwrite guidance](#receipt-integrity-and-recovery).
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
