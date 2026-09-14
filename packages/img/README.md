# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go straight from
Smart CDN (`<workspace>.tlcdn.com`) to the browser, never through Next's image optimizer.

## Quickstart

Next.js 16.3.3+ App Router, React 19, Node.js runtime.
**Unpublished dogfood:** ask a maintainer for matching img/utils/node/types tarballs.
After release: `npm install @transloadit/img && npm install --save-dev @transloadit/node`.
pnpm: `pnpm add @transloadit/img && pnpm add -D @transloadit/node`;
Yarn: `yarn add @transloadit/img && yarn add -D @transloadit/node`.

Run beside `package.json`. No account yet? Sign up in the browser; a new free workspace works.
For `./hero.jpg`, use any JPEG you have.

```bash
npx transloadit auth login
npx transloadit storage store ./hero.jpg website/hero.jpg --public
```

`--public` publishes the directory recursively, including future uploads. In `next.config.ts`:

```ts
import { withTransloaditImages } from '@transloadit/img/next/config'
export default withTransloaditImages({ /* your existing Next config */ })
```

Use an immutable filename for long-lived assets: `--overwrite` replaces the current path;
[a receipt cache tag does not pin old bytes](./docs/reference.md#cache-and-markup-cost).

Render in `app/page.tsx` or any Server Component. If your app has `src/`, prefix the source paths:

```tsx
import { StorageImage } from '@transloadit/img/next'
export default function Page() {
  return <StorageImage src="website/hero.jpg" alt="A canal house" width={960} preload />
}
```

Run `npm run dev` and open `/`. Commit `transloadit.images.json` and `transloadit-images.d.ts`, then deploy.
Public images need no app secrets. The required plugin bundles the catalog, with no runtime lookup.

## Responsive

Catalog paths autocomplete. `width` sets a responsive maximum; `preload` makes a hero eager,
preloads its responsive source and sets high fetch priority. Other images load lazily.
Add `placeholder="blur"` for an inline preview from the receipt's optional `thumbhash`.
[Layouts, art direction and the temporary priority alias](./docs/reference.md#responsive).

## Private

Use your application's session and per-object permissions, with a separate application key:
Console → Credentials → New Auth Key: Smart CDN on and scope `smart_cdn:sign`
(`assemblies:write` is also accepted, but grants broader Assembly access).
Set `TRANSLOADIT_SMART_CDN_KEY` and `TRANSLOADIT_SMART_CDN_SECRET` on your host, not the disposable
login key that `auth logout` revokes. [Private setup](./docs/reference.md#private).

## When it breaks

Opt into `errorFallback` to show a delivery failure instead of a broken image. Development adds
the HEAD result; see the terminal. Non-production login endpoints carry into the catalog.
[`baseUrl` and `urlParams`, diagnostics and recovery](./docs/reference.md#when-it-breaks).
`storage ls` / `storage receipts sync` recovery is unavailable until the S3 read API ships in production.
[Availability and receipt recovery](./docs/reference.md#receipt-integrity-and-recovery).

## Reference

[Full reference](./docs/reference.md) · [Maintainer dogfood setup](https://github.com/transloadit/node-sdk/blob/img-onboard/docs/img-dogfood.md).
