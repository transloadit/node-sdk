# `@transloadit/img`

Responsive Storage images for Next.js. Native `picture/srcset`; bytes go straight from
Smart CDN (`<workspace>.tlcdn.com`) to the browser, never through Next's image optimizer.

## Quickstart

Next.js 16.3.3+ App Router, React 19, Node.js runtime.
**Unpublished dogfood:** ask a maintainer for matching img/utils/node/types tarballs.
After release: `npm install @transloadit/img && npm install --save-dev @transloadit/node`.
pnpm: `pnpm add @transloadit/img && pnpm add -D @transloadit/node`;
Yarn: `yarn add @transloadit/img && yarn add -D @transloadit/node`.

Run beside `package.json`. No account yet? Sign up in the browser if you're new;
a new free workspace works. For `./hero.jpg`, use any JPEG you have.

```bash
npx transloadit auth login
npx transloadit image init website/ --public
npx transloadit storage store ./hero.jpg website/hero.jpg
npm run dev
```

Open `/storage-image-example`. Init publishes the directory and creates the factory,
`app/storage-image-example/page.tsx` and `transloadit.images.json`; store adds the first image.
If your app has `src/`, prefix the source paths; the catalog stays at the root.
Use the generated component in any Server Component:

```tsx
import { StorageImage } from '../lib/storageImage'
<StorageImage src="website/hero.jpg" alt="A canal house" width={960} preload />
```

Commit the catalog and generated code, then deploy. Public images need no application secrets.

## Responsive

Catalog paths autocomplete. `width` sets a responsive maximum; `preload` makes a hero eager,
preloads its responsive source and sets high fetch priority. Other images load lazily.
[Layouts, art direction and the temporary priority alias](./docs/reference.md#responsive).

## Private

Use your application's session and per-object permissions, with a separate application key:
Console → Credentials → Create Auth Key, Smart CDN on. Set `TRANSLOADIT_SMART_CDN_KEY` and
`TRANSLOADIT_SMART_CDN_SECRET` on your host, not the developer's disposable login key:
`auth logout` revokes that login key. [Private setup](./docs/reference.md#private).

## When it breaks

The scaffold shows a delivery failure instead of a blank page. In development it includes
the HEAD result; see the terminal for details. Non-production login endpoints carry into init.
[`baseUrl` and `urlParams`, diagnostics and recovery](./docs/reference.md#when-it-breaks).
`storage ls` and `storage receipts sync` require the S3 read API, currently off in production.
[Availability and receipt recovery](./docs/reference.md#receipt-integrity-and-recovery).

## Reference

[Full reference](./docs/reference.md) ·
[Maintainer dogfood setup](https://github.com/transloadit/node-sdk/blob/img-onboard/docs/img-dogfood.md).
