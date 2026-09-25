# Dynamic receipts in React

**Alpha — API may change.** These entries require Viewer 0.0.3 or newer (0.0.2 includes only
the Next.js adapter). Requires a matching API2 deployment with the pinned Storage
Built-ins. Install `@transloadit/viewer@alpha` alongside React 19. Receipts come from your
authenticated data layer; credentials stay in your server route.

```tsx
import { Image, getStorageAssetHref } from '@transloadit/viewer/react'

<Image src={receipt} alt="Canal house" sizes="(min-width: 800px) 640px, 100vw"
  style={{ maxWidth: 640, width: '100%', height: 'auto' }} />
<a href={getStorageAssetHref(receipt, { action: 'download' })}>Download original</a>
```

`Image` derives dimensions from the canonical receipt and reuses `TransloaditPicture`. It accepts
the existing presentation props: `sizes`, `style`, `className`, `loading`, `preload`, `objectFit`,
`errorFallback`, `retryKey`, `placeholder`, and native serializable attributes. It accepts neither separate
dimensions nor arbitrary transforms. `TransloaditPicture` remains exported from `/react` and
`/next` for precomputed models. Change `retryKey` after sign-in to retry a failed image.

The shared default endpoint is `/api/transloadit/media`. Override `route` with a same-origin
absolute path without query/fragment; include your application's base path. Pass the same route
to the href helper, which requires `action: 'original' | 'download'`. Originals support non-image
receipts too. Downloads use the last path segment of the authoritative receipt as their filename.

```ts
import { createStorageRoute } from '@transloadit/viewer/server'

export const { GET, HEAD } = createStorageRoute({
  workspace: serverConfig.workspace,
  authKey: serverConfig.authKey,
  authSecret: serverConfig.authSecret,
  authorizeAsset: authorizeStoredReceipt,
})
```

`authorizeAsset({ request, asset_id, version_id, action })` must return the authorized canonical
receipt or `null`, synchronously or asynchronously. Actions are `preview`, `original`, and
`download`; authorize each separately. The route validates workspace, exact IDs, safe path, and
preview geometry. Its structural receipt types describe the delivery fields; validate complete
canonical receipts with Types/Zod at ingestion.

The neutral handler uses Web Request/Response/WebCrypto with explicit configuration, no
environment reads, filesystem, Next, or Node SDK. Its `/server` export is unavailable to browser
bundles. Keep configuration in server modules; Next applications can add `import 'server-only'`
there. Use credentials scoped to `smart_cdn:sign` where available. Environment configuration in
the recipe below is an application choice, never an implicit package lookup.

Worker server conditions (`workerd`, `edge-light`) resolve the same Web handler before the
browser guard. See [Wrangler's conditional exports](https://developers.cloudflare.com/workers/wrangler/bundling/#conditional-exports).
Internal errors return a generic 500 and log only the failing stage (authorization or signing).
If your application needs richer diagnostics, record redacted details inside its authorizer.

## One authenticated Convex query

For an existing Next application configured with Convex Auth, use the request's
[session token](https://labs.convex.dev/auth/api_reference/nextjs/server#convexauthnextjstoken)
for [one authenticated query](https://docs.convex.dev/client/nextjs/app-router/server-rendering#authentication).
No bearer grants or capabilities belong in query arguments.

```ts
// app/api/transloadit/media/route.ts
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { createStorageRoute } from '@transloadit/viewer/server'
import { fetchQuery } from 'convex/nextjs'

import { api } from '../../../../convex/_generated/api'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing server configuration: ${name}`)
  return value
}

export const { GET, HEAD } = createStorageRoute({
  workspace: required('TRANSLOADIT_WORKSPACE'),
  authKey: required('TRANSLOADIT_SMART_CDN_KEY'),
  authSecret: required('TRANSLOADIT_SMART_CDN_SECRET'),
  async authorizeAsset({ asset_id, version_id, action }) {
    const token = await convexAuthNextjsToken()
    if (!token) return null
    return fetchQuery(api.media.authorizeReceipt, { asset_id, version_id, action }, { token })
  },
})
```

Adapt the following query to your tables. This minimal album example assumes `mediaVersions`
has a `by_asset_version` index on `asset_id, version_id`, an `albumId`, a canonical `receipt`, and
`deleted`. `albums` has `deleted`; `albumMembers` has a `by_album_user` index, `revoked`,
`expiresAt`, and `allowOriginals`. Accepted invites create memberships; invite revocation must
revoke them. If your application retains separate invite records, check them in this query too.
These live permission reads all happen in the same authenticated Convex query.

```ts
// convex/media.ts
import { getAuthSessionId } from '@convex-dev/auth/server'
import { storedAssetSchema } from '@transloadit/zod/v3/storageAsset'
import { v } from 'convex/values'

import { query } from './_generated/server'

export const authorizeReceipt = query({
  args: {
    asset_id: v.string(), version_id: v.string(),
    action: v.union(v.literal('preview'), v.literal('original'), v.literal('download')),
  },
  handler: async (ctx, { asset_id, version_id, action }) => {
    const sessionId = await getAuthSessionId(ctx)
    if (!sessionId) return null
    const session = await ctx.db.get(sessionId)
    if (!session || session.expirationTime <= Date.now()) return null
    const version = await ctx.db.query('mediaVersions')
      .withIndex('by_asset_version', q => q.eq('asset_id', asset_id).eq('version_id', version_id))
      .unique()
    if (!version || version.deleted) return null
    const album = await ctx.db.get(version.albumId)
    if (!album || album.deleted) return null
    const member = await ctx.db.query('albumMembers')
      .withIndex('by_album_user', q => q.eq('albumId', version.albumId).eq('userId', session.userId))
      .unique()
    if (!member || member.revoked || member.expiresAt <= Date.now()) return null
    if (action !== 'preview' && !member.allowOriginals) return null
    const receipt = storedAssetSchema.parse(version.receipt)
    if (receipt.asset_id !== asset_id || receipt.version_id !== version_id) return null
    if (action === 'preview' && (receipt.width === undefined || receipt.height === undefined)) return null
    return receipt
  },
})
```

Do not put `use cache`, React `cache()`, or a shared positive-auth cache around this query or route.
Session, invite, and album permission changes must participate in the query's live reads. Plain
React SPAs also need a same-origin cookie-authenticated endpoint: image elements cannot attach
arbitrary Authorization headers from local storage.

For ingestion, extract receipts from a fetched/verified Assembly bound to an authorized upload:

```ts
import { extractStoredAssemblyResults } from '@transloadit/zod/v3/storageResults'

const results = extractStoredAssemblyResults(verifiedAssembly, {
  assemblyId: authorizedUpload.assemblyId,
  workspace: configuredWorkspace,
})
// Persist each asset with assembly_id/step/result_id/original_id, idempotently.
```

`/v4/storageResults` has the same contract. Failed, unfinished, mismatched, and malformed
Assemblies throw; partial receipts never silently disappear. Node's `getStoredAssemblyResults`
reuses this source and retains failed-Assembly `ApiError`. The parser belongs to the existing Zod
package: Utils stays dependency-free, and Viewer installs/imports no generated schemas or SDK.

## Optional blur placeholders

```tsx
<Image src={receipt} alt="Canal house" placeholder="blur" />
```

The producing Step must request `output_meta: { thumbhash: true }` during upload, or use CLI
`storage store --placeholder blur`. API2 extracts and stores the optional `thumbhash` and
`has_alpha` metadata; Viewer does not decode your original or install a native image library.
Successful extraction adds metadata usage equal to 20% of the file's bytes. Extraction is
best-effort; missing or malformed metadata falls back to the normal empty placeholder with a
development-only note. No extraction is requested by default.

**A ThumbHash is recognizable image content.** Your authenticated data query must authorize
`preview` access before returning it, independently of the route's later access check. Do not
send hashes to a browser that may only download originals or is not allowed to see previews.
Already disclosed hashes, like downloaded images, cannot be revoked. Next's request-authorized
catalog renderer keeps blur disabled because authorization has not run at render time.

The small pure-JavaScript decoder runs wherever React renders (including the browser for a
live gallery). Next's catalog adapter decodes only on the server. The default is `"empty"`;
opting into `"blur"` adds a CSS background, no load handler or new image-loading state machine.
The final opaque image covers that background. Transparent images are a no-op, including when
the hash itself carries alpha but the receipt flag is missing. Canonical `has_alpha` takes
precedence over legacy `hasAlpha`.

Use the intrinsic aspect ratio or `objectFit="cover"`. `contain`, `none`, and `scale-down`
disable blur so it cannot remain visible in letterboxing. If a stylesheet sets `object-fit`,
also pass `objectFit` explicitly: React cannot inspect stylesheet rules during server rendering.
The placeholder approximates the original, not a separately encoded rendition of each crop.

## Policy, caching, and limits

Share one non-secret policy between the component and route:

```ts
import type { StorageRenditionPolicy } from '@transloadit/viewer/react'

export const mediaPolicy = {
  widths: [320, 640, 960, 1280], maximumWidth: 1920,
  formats: { avif: 45, webp: 75 }, fallbackQuality: 75, fallbackBackground: '#ffffff',
  crops: { square: { aspectRatio: 1, maximumWidth: 640 } },
} satisfies StorageRenditionPolicy
```

Pass `policy={mediaPolicy}` to `Image` and `policy: mediaPolicy` to the route. Select a crop with
`crop="square"`; display geometry uses the same rounded core candidate calculation. The server
policy remains authoritative even if a client tampers with its own copy. Defaults are widths
320/640/960/1280/1920/2560/3840, capped at 3840 and intrinsic geometry, AVIF 45/WebP 75, JPEG 75
on white, and no crops. Every ladder includes a capped terminal intrinsic width. Explicit ladders
allow 31 entries; at most eight crop profiles may use ratios from 1/8 through 8. Output dimensions
never exceed 8000. Unknown/duplicate parameters and unlisted candidates are denied. Templates,
origin, quality, background, dimensions, and crop ratios never come from request data.

`lifetimeMs` defaults to five minutes (1000 through 172800000). CDN signatures rotate at most once
a minute, bounded by half the lifetime, preserving at least half a lifetime on new URLs. Bunny
still keys on the full query; default Built-in parameters retain the existing canonical spelling.
Route URLs never expire and can request fresh authorization from long-open pages.

Every response is `private, no-store`. Redirects are 307 with an empty body; denied/malformed
requests share a safe 404, unsupported methods get 405, and internal failures get a sanitized 500.
GET/HEAD share authorization rules. No media byte proxy or per-rendition DAM lookup occurs.
A trusted server `baseUrl` can support local testing; never derive it from requests. Set
`diagnostics: process.env.NODE_ENV === 'development'` in app configuration for redacted policy
drift guidance after authorization. Logs contain permitted candidates and the policy-sharing
remedy, never original URLs, IDs, paths, receipts, or credentials.

Permission loss blocks future route requests. Previously issued CDN URLs remain usable until
expiry, subject to CDN/browser caching; already downloaded/decoded bytes cannot be revoked.
This route cannot make public Storage private. Use server-declared public prefixes and the
existing public/Next adapter for intentionally public media. Existing sealed Next routes,
static catalogs, custom Templates, markup, and low-level models remain supported.
