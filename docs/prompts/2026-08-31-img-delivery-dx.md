# `@transloadit/img` delivery and DX completion

## Why

The first private `@transloadit/img` cut proves that responsive Smart CDN candidates can be
rendered safely from Next.js. Its component API still exposes signing lifecycle and source-model
details that application authors should not need to understand. Private Storage previews also need
two explicit delivery choices: direct signed CDN URLs for high-volume views, and request-authorized
redirects for stricter revocation and cache-stable HTML.

An unsigned public `next/image` loader is intentionally out of scope until API2 can bind an
immutable delivery profile to allowed origins, source paths, transforms, dimensions, and budgets.
Disabling signature enforcement on the current `serve-image` Built-in would create an open
transformation and billing proxy.

## Decisions

- [x] Return a small integration object from `createTransloaditImage`: `{ Image }` for direct
      delivery and `{ Image, storageRoute }` when an authorization route is configured.
- [x] Use one `Image` component with `src="https://…"` or `src={{ storage: 'path/file' }}`.
- [x] Treat `width` and `height` as intrinsic dimensions, like the platform image element; remove
      duplicate source dimensions and the aspect-ratio exception API.
- [x] Derive a conservative responsive width ladder by default; keep `widths` as an advanced
      optional override and make `sizes` optional but strongly recommended.
- [x] Keep the long-lived public URL expiry policy in factory configuration and default its minimum
      lifetime to one year. Rotate expiry in coarse buckets of at most one day so a long-lived
      server factory cannot emit expired URLs while repeated renders stay cache-friendly.
- [x] Keep public URLs and direct private Storage previews going straight from the browser to Smart
      CDN. A Next server never proxies their bytes.
- [x] Keep direct Storage delivery as the default for gallery-scale use. Signed URLs are generated
      per request and support normal lazy loading; document the expiry tradeoff.
- [x] Add an opt-in Storage redirect mode for request-time application authorization. Its
      expiry-free local URLs carry a deterministic AES-256-GCM-SIV capability over the exact path
      and transform, so private names stay out of markup and clients cannot mutate them into
      arbitrary work. The route re-authorizes, issues a short-lived Smart CDN URL, and responds
      with a non-cacheable redirect; image bytes never pass through Next.
- [x] Reject duplicate/unknown route parameters, altered tokens, paths outside configured prefixes,
      unsupported transforms, and failed authorization without exposing private object details.
- [x] Keep explicit AVIF/WebP `<picture>` sources and a JPEG fallback. Do not use `Accept`-driven
      `format:auto` until CDN cache keys normalize or vary on the selected format.
- [x] Extend the packed Next.js 16 fixture to prove static public and redirect markup, request-time
      direct signing, route authorization, redirects, no secret leakage, and correct byte paths.
- [x] Add deterministic 1/20/100-image delivery benchmarks for HTML size and route invocation
      behavior. Record numbers without flaky wall-clock CI thresholds.
- [x] Rewrite the README around the short happy path, then explain the two private delivery modes
      and their security/performance tradeoff progressively.
- [x] Run focused tests, `yarn check`, full verification, package dry run, packed Next fixture, and
      council review.

## API2 follow-up (read-only in this slice)

- [x] Inspect `~/code/api2-clone-3` without modifying it.
- [x] Specify an immutable public delivery-profile contract with origin, path, redirect, transform,
      output, abuse, and billing limits enforced before imports or processing start.
- [x] Specify edge validation for an application-issued path-scoped token or cookie, including cache
      key normalization for CloudFront and Bunny.
- [x] Identify concrete API2 code, tests, infrastructure, Node SDK, release, and rollout work needed
      before exposing a public `next/image` loader.

### Read-only findings

- `builtin/serve-image@0.0.1` accepts an arbitrary HTTP(S) `fields.input`. It bounds the requested
  dimensions, quality, strategy, and format, but does not require signatures. Disabling a
  workspace's signature requirement would therefore expose an origin-fetching transformation and
  billing proxy.
- `builtin/storage-preview@0.0.1` and `builtin/storage-serve@0.0.1` correctly set
  `requireSignatureAuth: true`. The URL Transform gate rejects their unsigned requests before an
  Assembly is reserved, but Built-in definitions have no delivery-profile concept yet.
- CloudFront's `NoCacheSigExp` policy intentionally removes signature and expiry aliases from the
  cache key. Its viewer-request function validates known keys before cache lookup, but currently
  passes missing signatures and KVS misses onward. That fail-open behavior must never be attached to
  a cache behavior serving private shared entries.
- Bunny currently varies on hostname and every query parameter. This preserves authorization
  isolation, but every newly signed URL creates another cache entry.
- Bunny's August 2026 public preview changes the earlier provider conclusion: pre-cache Edge Scripts
  now offer an `onClientRequest` hook on every request. Native Advanced Token Authentication also
  supports HMAC-SHA256 over exact paths or prefixes and signs query parameters, but its Pull Zone
  security key is not a per-workspace application-key store. A Transloadit-wide multi-tenant path
  still needs a custom validator or an API2 token mint.
- API2 issue #7998 already defines the right immutable DAM identity:
  `/d/{assetId}/v{versionNumber}/{filename}`. Issue #8441 covers named transformation presets and
  responsive helpers, while #8796 owns worker-side decoded/intermediate/output resource safety.

### Recommended public delivery profile

Add a dedicated admission layer, not another boolean on `BuiltinTemplateDefinition`:

1. A versioned profile ID resolves server-side to one exact source origin (or a small named origin
   set), an allowed relative path prefix, and one pinned certified Template version. The public URL
   accepts only the profile ID plus a relative source path; it never accepts an arbitrary absolute
   origin or caller-selected Template.
2. The immutable profile records an allowed width lattice, qualities, formats, resize strategies,
   maximum source/output bytes, pixels, redirects, concurrency, miss rate, and billing budget.
   Redirects should be disabled in v1; if added, every hop must be revalidated against the same
   origin/path policy with DNS-rebinding and private-network protections.
3. Canonicalize and reject duplicates before profile lookup. Enforce the profile before Assembly
   reservation or Robot work. The cache identity includes host/workspace, profile version, canonical
   source path, source version, transform, and selected format.
4. Reuse `builtin/serve-image` as the execution primitive, but pin a new certified version or a
   profile-owned entry point. Do not silently broaden `0.0.1`, and do not allow arbitrary customer
   Template overrides in the public profile. Trusted signed integrations may keep their override.
5. Treat #8796's worker preflight/postflight as a dependency for production abuse resistance. API2
   request validation cannot by itself bound decompression or intermediate allocation.

This produces the eventual secretless loader contract:

```ts
createTransloaditLoader({ profile: 'marketing-v3', workspace: 'my-app' })
```

The loader may select width and quality but cannot hold an Auth Secret. `format:auto` should only be
enabled after the edge converts browser capability into an explicit selected-format cache dimension.
Until then, `@transloadit/img`'s AVIF/WebP `<picture>` sources remain safer and more predictable.

### Recommended private edge authorization

Use a dedicated protected hostname or cache behavior; do not retrofit optional auth onto the current
mixed public path:

1. The application issues a versioned HMAC capability containing `kid`, audience, workspace/profile,
   exact immutable asset version or canonical path prefix, allowed preset/transform, `nbf`, and `exp`.
   Prefer DAM asset/version identity from #7998 so internal Storage paths never become delivery IDs.
2. A viewer-request/pre-cache validator runs on every request, including hits. Missing tokens,
   unknown or stale key IDs, unavailable key state, duplicate claims, non-canonical paths, and invalid
   signatures fail closed before cache lookup.
3. Only after successful validation may auth token and expiry be excluded from the shared cache key.
   Host/workspace, resource/version, profile/preset, canonical transform, and selected format remain.
   Strip viewer auth before origin/logging where possible and add an origin-only edge attestation;
   API2 must reject direct requests and spoofable client headers.
4. Start with a separate CloudFront canary by tightening the existing function and KVS flow. Bunny
   now has equivalent pre-cache hooks in public preview, so build the validator around shared golden
   vectors and test it there next. Do not change the live wildcard or query variation until provider
   tests prove invalid/expired/unsigned requests cannot reuse a warm object.
5. Native CloudFront signed cookies are attractive for granting a directory of stable URLs, and
   native Bunny Advanced Tokens cover exact paths/prefixes. Neither alone provides Transloadit's
   desired per-workspace app-issued key contract on the current shared distribution, so keep the
   capability grammar provider-neutral.

### Required verification and rollout

- Share golden canonicalization/HMAC vectors between API2, Node SDK, CloudFront Functions, and Bunny
  Edge Script tests. Cover key rotation, exact/prefix scope, transform scope, cross-workspace replay,
  expiry/not-before, duplicate aliases, encoding ambiguity, and every fail-closed KVS/database path.
- Add API2 system tests showing rejected profile requests create no Assembly/import/Robot work, plus
  origin/path/redirect/SSRF and per-budget tests. Exercise #8796's real-backend resource boundaries.
- Add provider smoke tests that warm one object with token A, hit it with token B, then prove an
  absent, altered, expired, and cross-tenant token never receives that object. Verify distinct valid
  tokens share one cached representation and all content-changing fields split the cache.
- Land and deploy Storage PR #8844 separately after resolving its current merge conflict and review.
  Then ship: API2 profile admission; CloudFront canary and Terraform; Bunny preview parity; a Node SDK
  patch with the secretless loader; `@transloadit/img` publication and Content dogfood; finally docs,
  marketing, Astro/framework adapters, and Uppy/DAM integration where relevant.

## Progress and evidence

- 2026-08-31: PR #481 was green and based on current `origin/main`; no human or bot review comments
  were open before this completion slice started.
- 2026-08-31: 78 package tests pass. The packed Next.js 16.3 fixture proves static redirect markup
  under a configured `basePath`, dynamic direct signing, authorization, tamper rejection, empty
  non-cacheable redirects, and absence of secrets/private paths in browser-visible build output.
- 2026-08-31: The 100-image diagnostic measured direct delivery at 391,054 raw / 24,573 Brotli
  bytes with zero application image requests; redirect delivery measured 280,008 raw / 64,476
  Brotli bytes plus 100 authorization redirects. Direct therefore remains the gallery default.
- 2026-08-31: Local Claude Opus security review passed without merge blockers after independently
  verifying cross-policy cryptographic isolation and 113 package tests. Its recommended explicit
  replay regression now covers secret, workspace, Template, route, and `basePath` binding.
- 2026-08-31: Council review found that factory-fixed public expiry could eventually go stale and
  that `baseUrl` accepted non-HTTP schemes. Regression tests failed first; the implementation now
  uses a Next `use cache` expiry function and eagerly validates an HTTP(S)-only base URL. The packed
  Next 16.3 fixture keeps `/public-image` static while reporting a six-hour revalidation and
  twelve-hour cache expiry.
- 2026-08-31: The API2 repository and Storage PR #8844 were inspected read-only. Its existing
  untracked files were left untouched. Current CloudFront and Bunny configurations, Built-ins, URL
  Transform admission, and DAM/resource-limit issues informed the recommendation above.
