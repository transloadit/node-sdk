# @transloadit/utils

## 4.8.0

### Minor Changes

- 0c329bb: Add the storage-grant contract/codec: `StorageGrantClaims` types, `parseStorageGrantClaims`, browser-safe `decodeStorageGrant`, `normalizeStorageGrantPrefix` at the root, and deterministic HS256 `signStorageGrant`/`verifyStorageGrant` under `@transloadit/utils/node` — one wire contract for the grants minted by api2/integrator servers and verified by Companion's S3 provider.

## 4.7.1

### Patch Changes

- ed75f00: Add a framework-neutral `createSmartCdnImageCandidates` policy with an injected signer, and make
  the existing Node candidate helper share it. Optional intrinsic source dimensions now prevent
  upscaling and renditions whose derived height exceeds Smart CDN's image limit. Framework adapters
  can reuse the exported format and width normalization instead of copying those limits.

  Candidate policy now distinguishes millisecond timestamps from accidentally seconds-based expiry
  values and reports an invalid width by its index. Runtime `null` qualities are rejected consistently
  with the exported TypeScript contract instead of being treated as an omitted format.

  Ignore a legacy caller-provided `sig` while signing instead of including a value that the generated
  signature replaces, which could otherwise produce an unverifiable URL.
  Unsigned URLs now omit caller-provided `auth_key`, `exp`, and `sig` fields so they remain
  unambiguously unsigned and round-trip through the parser.

  Require callers to select a trusted workspace Template explicitly. The helper no longer defaults
  to the arbitrary-origin `builtin/serve-image` Template. Require a separate browser `fallbackUrl`
  because Template inputs are not necessarily browser-resolvable URLs. These intentional patch-level
  replacements affect only the newly introduced, not-yet-adopted image-candidate API.

## 4.7.0

### Minor Changes

- 7597b78: Add the rest of the Smart CDN URL grammar next to `getSignedSmartCdnUrl`, so applications stop
  carrying their own copies: `getSmartCdnUrl` (unsigned builder), `parseSmartCdnUrl` (the inverse of
  the builders — decodes once, keeps repeated query parameters, returns `auth_key`/`exp`/`sig` as
  `auth`) and `stripSmartCdnAuth` (removes the signature parameters byte-for-byte otherwise). Both
  builders accept a trusted `baseUrl` option (for example a local api2's URL Transform endpoint with
  a `{workspace}` placeholder); the signature does not cover the host, so it must come from
  configuration, never from user input. Exported from the root and the `./node` entry.

## 4.6.0

### Minor Changes

- a652ffa: Add an isomorphic `getSignedSmartCdnUrl` to the root export. It signs with WebCrypto, so browsers,
  edge runtimes and Node produce byte-identical Smart CDN URLs to the synchronous signer in
  `@transloadit/utils/node`, which now shares the same URL-building code. `signParams` and
  `verifyWebhookSignature` additionally accept `sha512`, matching `signParamsSync`.

## 4.5.1

### Patch Changes

- 85a0bbd: Replace the two-day-old Smart CDN candidate return value with structured sources for
  renderer-independent integrations. The only application consumer migrates with this release.

## 4.5.0

### Minor Changes

- 1565012: Add deterministic signed responsive-image candidates for Smart CDN.

## 4.4.1

### Patch Changes

- 507ec7f: Use GPT-5.6 Sol for OpenAI defaults, Claude Fable 5 for general Anthropic defaults, and Claude
  Sonnet 5 for image descriptions. Keep end-user Assembly Instructions compilation at medium
  reasoning for responsive generation.

## 4.4.0

### Minor Changes

- c2de344: Add a shared Assembly Instructions compiler and expose prompt-to-Assembly-Instructions helpers in
  the Node SDK and CLI.

## 4.3.0

## 4.2.0

## 4.1.9

## 4.1.8

## 4.1.7

### Patch Changes

- d443386: Add shared signature helpers in @transloadit/utils and reuse them in the Node SDK.
