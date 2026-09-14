# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go from Smart CDN to the
browser, never through Next's image optimizer. Sources are Storage paths or receipts, not URLs.

## Quickstart

Use Next.js 16.3.3+ App Router, React 19 and the default Node.js runtime (not Edge).
**Unpublished, private dogfood:** ask a maintainer for matching img/utils/node/types tarballs and
install the supplied files. [Maintainer setup](https://github.com/transloadit/node-sdk/blob/img-onboard/docs/img-dogfood.md) is optional background, not required access.
After release: `npm install @transloadit/img && npm install --save-dev @transloadit/node`.
pnpm: `pnpm add @transloadit/img && pnpm add -D @transloadit/node`;
Yarn: `yarn add @transloadit/img && yarn add -D @transloadit/node` (also after release).

Run beside `package.json`. No account yet? The browser approval page lets you sign up first;
the code stays valid for 15 minutes, including email verification, and a new free workspace works.

```bash
npx transloadit auth login
npx transloadit image init website/ --public
npx transloadit storage store ./hero.jpg website/hero.jpg
npm run dev
```

Open `/storage-image-example`. Login opens browser approval (on Windows, open the printed URL). Init publishes the directory,
creates an empty catalog and a runnable page; store adds the first image. With `src/app`,
source files go under `src/`; the catalog stays at the root:

```text
lib/storageImage.ts
app/storage-image-example/page.tsx
transloadit.images.json              # commit; workspace, public prefixes and image receipts
```

Use the generated component in another Server Component:

```tsx
import { StorageImage } from '../lib/storageImage'
<StorageImage src="website/hero.jpg" alt="A canal house" width={960} priority />
```

## Deploy

For public images, commit `transloadit.images.json` and the generated code, then deploy normally.
There is no `.env.local` to create and nothing to set in the hosting dashboard. CLI publication
commands maintain the catalog's `public` field; do not edit it by hand. `TRANSLOADIT_WORKSPACE`
is an advanced override, not a requirement. The factory calls `createStorageImages(catalog)` and
never reads or validates signing credentials for public-only rendering.

For private images, set `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` in your host's server-only
build and runtime environment. Use the same pair for the page build and deployed route handler;
never expose either as `NEXT_PUBLIC_`. The catalog supplies the workspace. See [Private](#private).

## Responsive

Catalog paths autocomplete. Native props are serializable attributes (`className`, `aria-*`,
`data-*`), not callbacks or refs. `priority` means eager loading, a responsive preload and high
fetch priority; other images default to native lazy loading.

Catalog paths and receipts are constrained by default: `width` sets the maximum display width,
deriving proportional CSS, responsive sizes and candidates bounded by the original.
Fixed layout describes a display box; the receipt supplies the original dimensions:

```tsx
<StorageImage src="website/avatar.jpg" alt="Your profile photo" layout="fixed" width={48} height={48} fit="cover" />
```

Fill with an aspect ratio creates its own responsive box. Cover requests a real Smart CDN crop:

```tsx
<StorageImage src="website/hero.jpg" alt="A canal house" layout="fill" fit="cover" aspectRatio="9/16" sizes="100vw" />
```

For different mobile/desktop crops, pass
`aspectRatio={{ '(max-width: 639px)': '9/16', default: '16/9' }}` once: it controls both box and crop.
Use `frame={false}` when your app already owns the positioned box.
Explicit `sizes`, `widths` and styles remain overrides. See [layout and art direction](./docs/reference.md#responsive).

## Private

Keep private uploads under a never-published directory such as `uploads/`. Removing `public` from
JavaScript does not revoke server policy or recall cached bytes. Supply the login's
key and secret as described in [Deploy](#deploy).

Replace the factory with request authorization using your application's own session and
per-object permission checks:

```ts
import { createStorageImages } from '@transloadit/img/next/server'
import catalog from '../transloadit.images.json'
import { authenticate, canReadStorageObject } from './authorization'

export const { StorageImage, storageRoute } = createStorageImages({
  ...catalog,
  cacheMaxAge: '1m',
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
Omit `cacheMaxAge` for the default `private, no-store` behavior. CDN grants have 30–60 minutes
remaining by default; redirect caching and downstream grant expiry are separate limits.

`image init uploads/ --private --write-env` generates this route with a fail-closed authorization
placeholder in a fresh project. To upgrade an existing public project, edit its factory and add
the route above; init never overwrites files. Catalog public paths remain unsigned and
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
  width={960}
  errorFallback={<p role="status">Image unavailable</p>}
/>
```

The scaffold already includes a visible `errorFallback`. This optional client boundary replaces a
failed native image; without it, native alt/broken-image behavior remains. JPEG format fallback
does not recover HTTP failures.

`baseUrl` and `urlParams` override CDN delivery on the factory, independently of the CLI API
`--endpoint` / `TRANSLOADIT_ENDPOINT`. Use trusted endpoints only; see [delivery overrides](./docs/reference.md#delivery-overrides).

Storage commands print which credential source wins: shell → project `.env` → saved login.
Init deliberately uses the saved login. Store, list, sync and publication verify the winning
key's workspace against the catalog and refuse mismatches before acting. Use `--workspace`
explicitly for another workspace, with `--receipts` for its separate catalog.
Login checks Storage policy access without publishing; if unavailable, it links to the
[Credentials](https://transloadit.com/c/<workspace>/template-credentials/) sidebar page, where the CLI's Auth Key lives.
Older deployments may watermark Community-plan uploads; the CLI reports changed bytes and saves
metadata for the stored image instead of suggesting an overwrite.
Recover the committed catalog without downloading originals:

```bash
npx transloadit storage ls website/
npx transloadit storage receipts sync website/
npx transloadit auth status
npx transloadit auth logout
```

Logout revokes browser-login keys; any application using that same key loses access too.
Imported and legacy keys are only forgotten locally unless `auth logout --revoke` is explicit.

## Reference

See the [full reference](./docs/reference.md) for credentials, upload receipts, publication,
advanced layouts, caching, Template upgrades and browser recovery controls.

The supported Next.js floor is 16.3.3 for this preview's App Router/Cache Components integration;
earlier patches are outside its compatibility coverage. The packed consumer fixture runs 16.3.4
with Cache Components both enabled and omitted. Production Bunny caching and warm/cold latency
still require deployment measurements; smaller image bytes alone do not establish faster pages.
Public URLs have no expiry, but their `v` tag only changes the cache key, not the origin version:
an old uncached URL can serve new bytes after a path overwrite. Prefer immutable filenames.
