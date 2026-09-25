# `@transloadit/viewer`

**Alpha — API may change between releases. Pin the exact version in production. Images only for now.**

Responsive images for Next.js and [dynamic React receipts](docs/react-storage.md). Native `picture/srcset`;
bytes go straight from Smart CDN (`<workspace>.tlcdn.com`) to the browser, never through Next's optimizer.

## Quickstart

Next.js 16.3.3+ App Router, React 19, Node.js runtime.
`npm install @transloadit/viewer@alpha && npm install --save-dev @transloadit/node`.
pnpm: `pnpm add @transloadit/viewer@alpha && pnpm add -D @transloadit/node`;
Yarn: `yarn add @transloadit/viewer@alpha && yarn add -D @transloadit/node`.
Storage needs a matching API2 deployment; [existing HTTP/S3 assets](#existing-http-or-s3-assets) do not.

Run beside `package.json`. Start with `auth login` even without an account: choose Sign up in the
browser it opens, create a free workspace, and approve the CLI. For `./hero.jpg`, use any JPEG you have.

Prefer `--hashed` for images you will replace: it generates an immutable filename such as
`website/hero.fce9d56a.jpg`. The command below includes it; use the printed JSX path, with no `--overwrite`.

```bash
npx transloadit auth login
npx transloadit storage store ./hero.jpg website/hero.jpg --public --hashed
```

`--public` publishes the directory recursively, including future uploads. In `next.config.ts`:

```ts
import type { NextConfig } from 'next'
import { withTransloaditImages } from '@transloadit/viewer/next/config'
const nextConfig: NextConfig = { /* your existing Next config */ }
export default withTransloaditImages(nextConfig)
```

Render in `app/page.tsx` or any Server Component. If your app has `src/`, prefix the source paths:
Use the path printed by your upload as `src`; the hash below is only an example.

```tsx
import { Image } from '@transloadit/viewer/next'
export default function Page() {
  return <Image storage src="website/hero.fce9d56a.jpg" alt="A canal house" width={960} preload />
}
```

Run `npm run dev` and open `/`. Commit `transloadit.images.json` and `transloadit-images.d.ts`, then deploy.
Public images need no app secrets. The required plugin bundles the catalog, with no runtime lookup.

## Responsive

Catalog paths autocomplete. `width` sets a responsive maximum; `preload` makes a hero eager,
preloads its responsive source and sets high fetch priority. Other images load lazily.
`storage store --placeholder blur` requests a server ThumbHash; `placeholder="blur"` renders it.
[Placeholders, extraction cost, layouts and art direction](./docs/reference.md#responsive).

## Existing HTTP or S3 assets

Use a [compatible Template](./docs/reference.md#custom-templates) that pins your origin or bucket:

```tsx
<Image workspace="my-shop" template="products" src="chairs/oak.jpg" alt="An oak chair" width={1200} height={800} />
```

No Storage upload or catalog. Supply intrinsic dimensions and that workspace's server-only signing
key. Images shrink to fit their container by default; `layout="none"` leaves sizing to your CSS.
For private assets, authorize in the calling Server Component or use the per-request route
below, checking workspace, template and path. [Setup, metadata and defaults](./docs/reference.md#custom-templates).

## Private

Wire `getSession` to your application's session and per-object permissions; it is not an SDK helper:

```ts
// transloadit.authorize.ts, beside next.config.ts
import type { AuthorizeTransloaditImage } from '@transloadit/viewer/next/server'
import { transloaditStoragePreviewTemplate } from '@transloadit/viewer'
import { getSession } from './lib/authorization'
export const authorize: AuthorizeTransloaditImage = async ({ asset_id, request, template }) =>
  template === transloaditStoragePreviewTemplate &&
  asset_id !== undefined && (await getSession(request))?.canReadAsset(asset_id) === true
```

```ts
// app/api/storage-images/route.ts (prefix with src/ if needed)
export { GET, HEAD } from '@transloadit/viewer/next/route'
```

Console → Credentials → New Auth Key → “Private image delivery”: Smart CDN on, `smart_cdn:sign`
(`assemblies:write` is also accepted, but grants broader Assembly access). Use this application key,
not the disposable login key that `auth logout` revokes, in `.env.local` and your host's server-only build/runtime env:

```dotenv
TRANSLOADIT_SMART_CDN_KEY=…
TRANSLOADIT_SMART_CDN_SECRET=…
```

Restart `next dev` after adding the authorizer. [Private setup and authorization contract](./docs/reference.md#private).

## When it breaks

Opt into `errorFallback` to show a delivery failure instead of a broken image. Development adds
the HEAD result; see the terminal. Non-production login endpoints carry into the catalog.
[`baseUrl` and `urlParams`, diagnostics and recovery](./docs/reference.md#when-it-breaks).
Lost metadata? Restore the committed catalog or [recover it from Storage](./docs/reference.md#recovery).

## Reference

[Store an image from your application server](https://github.com/transloadit/node-sdk/blob/main/packages/node/README.md#store-an-image).
[Full reference](./docs/reference.md) · [Version-pinned delivery](./docs/reference.md#cache-and-markup-cost) · [Maintainer dogfood setup](https://github.com/transloadit/node-sdk/blob/main/docs/img-dogfood.md).
