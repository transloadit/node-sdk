# `@transloadit/img`

Responsive Transloadit Storage images for Next.js. Native `<picture>` format selection and
`srcset` sizing; image bytes go straight from Smart CDN to the browser, never through Next's
image optimizer. Sources are Storage paths or saved receipts, not arbitrary remote URLs.

Direct delivery makes the route dynamic. Use redirect delivery for static pages (details below).

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

### Log in and store an original

Run from your app root (beside `package.json`); `images.json` is written there:

```bash
yarn transloadit auth login
yarn transloadit storage store ./hero.jpg website/hero.jpg --receipts images.json
```

Login prompts with hidden input and saves CLI credentials outside your app. The store command
prints the complete factory and page below. **Commit images.json**: it is your image catalog.

### Create your component

Save the printed factory as `lib/storageImage.ts`:

```ts
import { createTransloaditImageFromEnv } from '@transloadit/img/next/server'

export const { StorageImage } = createTransloaditImageFromEnv({
  storage: { allowedPathPrefixes: ['website/'], delivery: 'direct' },
})
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
    />
  )
}
```

Add the three rendering values to your gitignored `.env.local`, then start Next:

```dotenv
TRANSLOADIT_WORKSPACE=your-workspace-slug
TRANSLOADIT_SMART_CDN_KEY=your-smart-cdn-auth-key
TRANSLOADIT_SMART_CDN_SECRET=your-smart-cdn-secret
```

Supply these during `next build` and runtime. Do not prefix them with `NEXT_PUBLIC_`.
That's your first image. `preload` implies eager; other images default to native lazy loading.

Prefer generated files? `yarn transloadit image init --next website/` writes the factory and
prints those environment names without writing env files. It detects `app/` or `src/app/`
and refuses to overwrite existing code.

## Ship it privately

Use request-authorized redirects for private images or cached pages. The browser sends its native
same-origin session cookie; it cannot add a custom Bearer header. Replace the factory with:

```ts
import { createPrivateStorageImages } from '@transloadit/img/next/server'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createPrivateStorageImages({
  allowedPathPrefixes: ['website/'],
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
The page stays unchanged. `image init --next --private website/` generates a private route and
a factory that denies all requests until you wire in your authorization. Prefixes limit signing,
not per-user access. An empty array denies all; `['']` explicitly permits the workspace root.
The private factory takes `allowedPathPrefixes`, `authorize` and `public` at the top level;
the general factory groups them under `storage` and `storage.delivery`.
Trusted `template`, `baseUrl` and `urlParams` overrides also work on the private factory.
For your own sign-in or unavailable-image UI, use the optional `errorFallback` shown below.

### Keep marketing pages static

Explicitly publish only the marketing directories with `public: ['website/']` on the private
factory (or `storage.delivery.public` on the general factory). Their redirects skip authorization
and use `public, max-age=0, s-maxage=<rotation>, stale-while-revalidate=60`, bounded by the remaining
grant lifetime including the stale window. All other directories stay behind `authorize` with
`private, no-store`. Public prefixes must be inside `allowedPathPrefixes`; nothing becomes public
implicitly. Do not put account-specific data in a public prefix.
`public: ['']` explicitly publishes the entire allowed workspace root; use narrower prefixes.

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
Login saves credentials locally; the first API request verifies them with the server.
CLI lookup remains shell environment, current directory `.env`, then the credentials file.
Keep the write key out of app env files: Next reads `.env` too.

Rendering uses a **Smart CDN Auth Key** from the same workspace. The server separates the two
purposes by design: Assembly creation rejects a Smart CDN key; Smart CDN rejects an Assembly-only
key. `TRANSLOADIT_WORKSPACE` is the slug in `/c/your-workspace/`, not a workspace ID.
Module-scoped factories need these rendering values at build time as well as runtime.

The Assembly client is a seed-only dependency; it is not part of rendering or the browser.
`--endpoint` (or `TRANSLOADIT_ENDPOINT`) selects a trusted CLI API override. The separate
`TRANSLOADIT_ASSEMBLY_ENDPOINT` in the maintainer seed script is only for that script.
See [local dogfood](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md)
for direct devdock delivery, including the required CDN acknowledgment.

## Layout without the arithmetic

`layout="constrained" maxWidth={960}` derives proportional responsive CSS, the
`auto, (min-width: 960px) 960px, 100vw` sizes expression for lazy images and a ladder capped at
1920px and the source. Eager/preloaded images omit `auto`. Explicit `sizes` remains your override.

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

For different mobile and desktop crops, pass width breakpoints in priority order and a default:

```tsx
<StorageImage
  src={images['website/hero.jpg']}
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
again at the handler. Key/route/Template changes can invalidate it, and old-Template acceptance
ends at its configured cutoff. Only cached redirects and already-issued CDN grants delay revocation.

Default `Cache-Control: private, no-store` rechecks every redirect request. To trade faster repeat
loads for delayed reauthorization, opt in with `delivery.cacheMaxAgeMs: 30_000`. The `307` uses
`private, max-age=30` (HTTP seconds), capped at the rotation interval and signed lifetime. Errors
remain `no-store`. Cached redirects may grant access without a new app check until that age elapses.
CDN URLs already issued remain usable until their own expiry; downloaded bytes cannot be recalled.

Production Smart CDN uses Bunny for `*.tlcdn.com`: hostname and the whole query string form the
cache key. Changing expiry/signature creates a new cache entry, so signatures rotate once per
expiry interval by default. Shorter grants or rotation intervals mean more cold transformations.

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

### Template migrations and revocation

Capabilities bind the Template version and route/basePath. During a rollout, set the factory's
`previousTemplatesUntil` to an **absolute UTC millisecond timestamp**. Until that cutoff, the
current builtin accepts markup from the preceding version (`builtin/storage-preview@0.0.1`).
Use `previousTemplates: ['your-previous-template']` to override the list; at most four versions
are accepted. Restarting a process does not extend the deadline. Without a cutoff, only the current
Template is accepted. Old requests retain their original Template and still follow current
prefix/authorization policy. Rebuild cached pages before the deadline.

Set `previousTemplates: []` or rotate the signing secret to reject old capabilities immediately
at the handler. Already-issued or cached CDN grants remain usable until their own expiry.
An explicit fixed cutoff avoids silently extending a migration every time a serverless process
starts. Coordinate custom Template upgrades with their owners and keep prior versions deployed
through the migration window.

## Responsive policy

The default signed template is `builtin/storage-preview@0.0.2`. AVIF quality 45 and WebP quality
75 precede a JPEG quality 75 fallback. Formats use separate URLs, not unkeyed Accept negotiation.
Candidate widths follow 320, 640, 960, 1280, 1920, 2560, 3840 plus intrinsic width, bounded by the
source and backend dimensions. `widths` overrides the ladder; the JPEG fallback is no larger than
its largest candidate. For a 48px avatar, `widths={[48, 96]}` also caps JPEG at 96px.

Explicit `sizes` describes CSS layout; it does not set that layout. Without a derived or explicit
size, lazy images default to `sizes="auto, 100vw"` (automatic CSS-box sizing where supported,
viewport fallback otherwise); eager/preloaded images retain `100vw`. Auto sizing is lazy-only:
Chrome 126+ and Firefox; not Safari, which uses the listed fallback.
`objectFit` controls CSS, while the default `r: 'pad'` preserves source
proportions in encoded candidates. AVIF/WebP/PNG candidates sign `bg: '#00000000'` to preserve
transparency through both preview and encoding; JPEG signs an opaque background, white by default.
`fallbackBackground="#224466"` changes only the JPEG background (six RGB hex digits, or eight RGBA
digits ending in `ff`). Named colors and transparent JPEG backgrounds are rejected before signing.
Pass raw hex colors: URL signing encodes `#` as `%23`. `bg` cannot be overridden through global
`urlParams`. A custom Template must support the same background field contract.
`formats` sets per-format quality; `fallbackQuality` sets JPEG quality.

The default minimum CDN lifetime is one hour with one-hour rotation windows (one to two hours of
remaining validity). URLs stay identical within each wall-clock hour. Configure
`lifetime` on `createPrivateStorageImages` for one control, with rotation derived from it. The
advanced factory exposes `storage.expiresInMs` and `rotationIntervalMs`; their sum cannot exceed
48 hours. Without `errorFallback`, a 403/404 uses native broken-image/alt behavior. JPEG is a format
fallback, not HTTP-error recovery. Opt-in `deferUntilHydrated` delays noncritical images; leave it
off unless addressing an observed WebKit replay issue.

## Diagnose and handle image failures

In development only, the server performs one HEAD per unique path/Template per factory, with a
five-second timeout. Concurrent/repeated renders share that probe. Redirects probe only after
application authorization; disallowed prefixes fail before any request. Production performs no
diagnostic requests. Restart development to retry a failed check or after changing credentials.

Denied redirect routes also emit one development-only hint per reason: route/basePath mismatch,
invalid or stale capability (secret/Template changes), disallowed prefix, or failed authorization.
These messages contain no requested path, URL or secret. Next's bundled server modules infer
`basePath` from its build configuration; supply it explicitly for externalized integrations.
Direct delivery logs once per factory in development that it makes the route dynamic.

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
The Storage S3 API must be enabled separately: successful Assembly-based storage or image delivery
does not imply that listing is enabled. A disabled S3 API returns HTTP 403, even with valid credentials.
`storage store --overwrite` explicitly replaces an occupied path; it is never the default. Prefer
immutable filenames because delivery resolves paths, not receipt hashes, and cached bytes can outlive
an overwrite. Commit your receipts until a catalog recovery API exposes all required image metadata.

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

`createTransloaditImage({ authKey, authSecret, workspace, storage })` supports secret managers and
multiple workspaces. The env factory snapshots only the three rendering values; it loads no files
and never falls back to Assembly credentials. All three factories, including
`createPrivateStorageImages`, accept a trusted compatible `template`,
`baseUrl` and transport `urlParams`. Never derive these signing policies from request input.

`@transloadit/img` exposes `createTransloaditImageModel` and serializable model types for other
framework adapters. `@transloadit/img/next` renders a resolved model without owning credentials.
