# Dynamic Storage Viewer contract

Implementation contract for the SDK and Convex integration. Viewer remains alpha.

```tsx
import { Image, getStorageAssetHref } from '@transloadit/viewer/react'

// Canonical StoredAsset plus required positive integer width and height.
// Receipts come from the authenticated app query, never signed models or credentials.
<Image src={receipt} alt="Canal house" sizes="(min-width: 800px) 640px, 100vw" />
<a href={getStorageAssetHref(receipt, { action: 'download' })}>Download</a>
```

`Image` derives geometry from the receipt and reuses `createTransloaditImageModel` and
`TransloaditPicture`. Existing presentation/loading/error fallback props remain available.
`TransloaditPicture` remains a public low-level renderer. `route` defaults to
`/api/transloadit/media`; it can be overridden with a same-origin absolute path on both the
component and href helper. `getStorageAssetHref` requires action `original` or `download`.
There are no bearer grants, embedded URLs, paths, dimensions, or secrets in route parameters.

```ts
import { createStorageRoute } from '@transloadit/viewer/server'

export const { GET, HEAD } = createStorageRoute({
  workspace: 'my-workspace',
  authKey: serverConfig.authKey,
  authSecret: serverConfig.authSecret,
  async authorizeAsset({ request, asset_id, version_id, action }) {
    // ONE authenticated Convex query checks live session/invite/album membership,
    // exact asset + retained version, and action; returns its stored receipt or null.
    return queryAuthorizedReceipt({ request, asset_id, version_id, action })
  },
})
```

Actions are exactly `preview`, `original`, and `download`; null denies. The callback must
return the authoritative canonical `StoredAsset`, not a boolean. Preview additionally requires
width and height. The route verifies workspace and exact identifiers against that receipt.
Original and download work for non-image receipts too. Download uses only the last path segment
of the trusted receipt, with the same filename validation as original delivery in the Node SDK.

Optional `policy` on the route and component has `widths`, `maximumWidth`, `formats`,
`fallbackQuality`, `fallbackBackground`, and `crops`. Defaults are a conservative ladder capped
at 3840, AVIF 45/WebP 75, JPEG 75 on white, and no crops. A terminal width capped by intrinsic
geometry is always included. At most eight named crop profiles may specify `aspectRatio`
(1/8 through 8) and optional `maximumWidth`. Select one with `crop="square"`; share the same
non-secret policy between server and client. Quality, background, height, and crop ratios never
come from the request. Unknown/duplicate parameters and candidates outside server policy fail.

Optional `lifetimeMs` defaults to five minutes (1000 through 172800000). Existing CDN rotation
and full-query Bunny cache keys remain unchanged. Route URLs do not expire; each GET/HEAD
reauthorizes and redirects to freshly signed, exact-version pinned Built-ins. No DAM query per
rendition and no app byte proxy. All responses are private/no-store; malformed and denied requests
share a safe 404, other methods get 405, internal failures get a sanitized 500. Previously issued
CDN URLs and already downloaded bytes cannot be revoked by this route and remain usable until
their expiry/cache policy permits. Never put this route or a positive authorization in a shared cache.

Configuration is explicit: no environment reads, filesystem, Node APIs, Next dependency, or Node
SDK imports. Signing uses Utils WebCrypto. A trusted server-only `baseUrl` override supports local
testing; never derive it from a request. Worker server conditions (`workerd`, `edge-light`) resolve
the Web handler before the browser import guard. Internal failures log only their stage
(authorization or signing); their details remain absent from responses and logs.
`diagnostics: true` is a development-only opt-in, set by
the app, that logs redacted policy drift after authorization, including the permitted candidate
shape and remedy; keep it off in production.

Pure retained-results extraction is `extractStoredAssemblyResults(assembly, { assemblyId,
workspace })` from `@transloadit/zod/v3/storageResults` (or `/v4/storageResults`). This narrow
entry reuses canonical Zod schemas and their existing generation. Node imports the same source;
Convex installs the existing Zod package. Utils stays dependency-free and Viewer gains no runtime
dependencies, installed schema files, or schema imports. Viewer accepts the structural receipt
fields it consumes and validates identity/path/geometry; full receipt validation remains with
the canonical schemas at ingestion. Use only a fetched/verified Assembly
bound to an authorized upload. Preserve `assembly_id`, `step`, `result_id`, and `original_id` for
idempotent registration. Node's existing `getStoredAssemblyResults` reuses extraction while
preserving its failed-Assembly `ApiError`. Convex can use extraction without the Node SDK.

## Verification and release gates (2026-09-25)

Cross-repo integration proof used implementation commit
`4b904e5df15c2cccc2e73b85c4b916f8df8d1e41` and packed Viewer SHA-256
`1c3ca2c7668a178a982011f8f6b4bfc73ec8e41065707ecedddbc6802697133b`.
The lead verified 50 Content tests with no Content source/dependency edits, eight identical
old/new models, and 24 byte-identical lazy/eager/preload renderings against published Viewer
0.0.2. The final-pack local security matrix passed 32 HTTP cases, including a two-second maximum
expiry bound, plus Chromium/WebKit checks. A second independent Opus read-only review found no
P0–P2 issues and traced the corrected expiry assignment. Separate production signing/expiry
canaries passed; they do not replace the package or application integration checks.

SDK `yarn check` and `verify:full` passed. The follow-up council found no issues. Package tests
cover maximum lifetime and stable/rotated GET/HEAD grants for plain/cropped previews and
originals/downloads. The packed browser fixture also verifies the actual mock CDN origin,
pinned template, exact asset, and expiry before checking long-open refresh behavior.
Downloads retain the real JPEG attachment response: Chromium and macOS WebKit save and compare
the bytes and filename. Linux Playwright WebKit embeds supported attachments instead of emitting
a download event ([upstream #34076](https://github.com/microsoft/playwright/issues/34076)); that
engine checks the browser-delivered attachment header, exact bytes, and decoded image.

Release requires real Convex ingestion/session/membership/action/browser proof in
[Convex PR #33](https://github.com/transloadit/convex/pull/33), green SDK CI and maintainer review
of [SDK PR #518](https://github.com/transloadit/node-sdk/pull/518), then the normal Version
Packages and alpha publication workflow. The completed Content/local security proof is distinct
from those application and release gates. No production deployment or publication is authorized
by this implementation task.

The deferred API2 watermark follow-up is tracked separately in
[API2 issue #9253](https://github.com/transloadit/api2/issues/9253); it requires no backend work
in this SDK change.
