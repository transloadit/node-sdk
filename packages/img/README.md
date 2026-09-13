# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go from Smart CDN to the
browser, never through Next's image optimizer. Sources are Storage paths or receipts, not URLs.

## Quickstart

**Unpublished, private dogfood:** use [local packages](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md) until release.
The published install will be `yarn add @transloadit/img && yarn add -D @transloadit/node`.
Use Next.js 16.3.3+ App Router, React 19 and the default Node.js runtime (not Edge).

Run beside `package.json`, using a Storage-enabled workspace:

```bash
yarn transloadit auth login
yarn transloadit image init website/ --public --write-env
yarn transloadit storage store ./hero.jpg website/hero.jpg
yarn dev
```

Open `/storage-image-example`. Login opens browser approval. Init publishes the directory,
creates an empty catalog and a runnable page; store adds the first image. With `src/app`,
source files go under `src/`; the catalog stays at the root:

```text
lib/storageImage.ts
app/storage-image-example/page.tsx
images.json                         # commit
.env.local                          # workspace only for --public; never commit
```

Use the generated component in another Server Component:

```tsx
import { StorageImage } from '../lib/storageImage'
<StorageImage src="website/hero.jpg" alt="A canal house" layout="constrained" maxWidth={960} preload />
```

Catalog paths autocomplete. Native props are serializable attributes (`className`, `aria-*`,
`data-*`), not callbacks or refs. `preload` implies eager; other images default to native lazy loading.
Public means **no secret in the app**: rendering never reads or validates signing credentials.

## Responsive

`constrained` and `fixed` follow Astro's layout vocabulary; `fill` follows Next.js.
Constrained layout derives proportional CSS and responsive sizes, bounded by `maxWidth` and the
original. Fixed layout describes a display box; the receipt supplies the original dimensions:

```tsx
<StorageImage src="website/avatar.jpg" alt="Your profile photo" layout="fixed" width={48} height={48} fit="cover" />
```

Fill occupies an already-sized, positioned parent. Cover requests an actual Smart CDN crop:

```tsx
<div style={{ position: 'relative', aspectRatio: '9/16' }}>
  <StorageImage src="website/hero.jpg" alt="A canal house" layout="fill" fit="cover" aspectRatio="9/16" sizes="100vw" />
</div>
```

Match the crop to the actual container. For different mobile/desktop crops, pass
`aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}` and match those ratios in your CSS.
Explicit `sizes`, `widths` and styles remain overrides. See [layout and art direction](./docs/reference.md#responsive).

## Private

Keep private uploads under a never-published directory such as `uploads/`. Removing `public` from
JavaScript does not revoke server policy or recall cached bytes. Supply the login's workspace,
key and secret as server-only build/runtime environment values; never use `NEXT_PUBLIC_`.

Replace the factory with request authorization using your application's own session and
per-object permission checks:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import images from '../images.json'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createStorageImages({
  images,
  cacheMaxAgeMs: 60_000,
  authorize: async ({ path, request }) => {
    const user = await authenticate(request)
    return user !== null && (await canReadStorageObject(user, path))
  },
})
```

`request` is a standard Web `Request`; your session library reads the browser's native cookie.
Export the handler in `app/api/storage-images/route.ts`:

```ts
export { storageRoute as GET, storageRoute as HEAD } from '../../../lib/storageImage'
```

The default route is `/api/storage-images`. The page stays unchanged; denied requests return `404`.
Each uncached image load is one function invocation. This example caches its private `307`
redirect for up to a minute, trading repeat-load cost for delayed reauthorization. Already-issued
CDN links remain usable until their expiry. Image bytes always bypass the application.
Omit `cacheMaxAgeMs` for the default `private, no-store` behavior.

`image init uploads/ --private --write-env` generates this route with a fail-closed authorization
placeholder. Add `public: ['website/']` to a mixed factory; those images remain unsigned and
make no application image requests. See [publication policy](./docs/reference.md#mixed-public-and-private-images).

## When it breaks

Development performs one background HEAD per path/Template, bounded to five seconds. It never
blocks rendering or logs signed URLs or secrets. A `Transloadit-Error: NO_SIGNATURE_FIELD` response
suggests `transloadit storage publish website/`; a generic 400 does not identify that cause, and
404 points to the workspace, path or Template. Production performs no diagnostic requests.

```tsx
<StorageImage
  src="website/hero.jpg"
  alt="A canal house"
  layout="constrained"
  maxWidth={960}
  errorFallback={<p role="status">Image unavailable</p>}
/>
```

The optional client boundary replaces a failed native image; without it, native alt/broken-image
behavior remains. JPEG format fallback does not recover HTTP failures.

Storage commands print which credential source wins: shell → project `.env` → saved login.
`init --write-env` deliberately uses the saved login, so remove stale overrides before storing.
Login checks Storage policy access without publishing; if unavailable, it links to the
[workspace Console](https://transloadit.com/c/<workspace>/template-credentials/).
Recover the committed catalog without downloading originals:

```bash
yarn transloadit storage ls website/
yarn transloadit storage receipts sync website/ --receipts images.json
```

## Reference

See the [full reference](./docs/reference.md) for credentials, upload receipts, publication,
advanced layouts, caching, Template upgrades and browser recovery controls.

The supported Next.js floor is 16.3.3 for this preview's App Router/Cache Components integration;
earlier patches are outside its compatibility coverage. The packed consumer fixture runs 16.3.4
with Cache Components both enabled and omitted. Production Bunny caching and warm/cold latency
still require deployment measurements; smaller image bytes alone do not establish faster pages.
Public URLs have no expiry, but their `v` tag only changes the cache key, not the origin version:
an old uncached URL can serve new bytes after a path overwrite. Prefer immutable filenames.
