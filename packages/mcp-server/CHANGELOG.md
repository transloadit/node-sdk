# @transloadit/mcp-server

## 0.3.34

### Patch Changes

- be56c7f: Request server-generated image placeholders with `storeImage(..., { placeholder: 'blur' })`
  or `storage store --placeholder blur`, without adding a native image decoder to the SDK.
  Extraction is optional and best-effort; successful extraction adds metadata usage equal to 20%
  of the file's bytes. Omission performs no extraction.

  Preserve `thumbhash` and `has_alpha` in Storage receipts, native asset reads, Assembly recovery,
  batch results and catalog sync. Viewer remains alpha and accepts server alpha metadata as well
  as older `hasAlpha` catalogs. Private request-authorized delivery still omits inline preview pixels.
  Hashed upload replays never overwrite or re-upload an image to generate missing metadata.

  Release MCP alongside the SDK to keep its validated dependency versions aligned.

- Updated dependencies [be56c7f]
  - @transloadit/node@4.14.0

## 0.3.33

### Patch Changes

- 38492fe: Remove Sharp from automatic SDK installation and the ordinary import graph, fixing the 4.13.0
  Supabase Edge bundle-size regression. Ordinary uploads and verified Storage receipts no longer
  decode images locally. Existing blur hashes remain usable.

  `storeImage()` and `storage store` no longer generate new blur hashes. Image uploads and
  server-verified dimensions are unchanged; receipts without hashes render without a blur background.

- Updated dependencies [38492fe]
  - @transloadit/node@4.13.1

## 0.3.32

### Patch Changes

- a2c5dd7: Require Node 20.10.0+ for JSON import attributes and composed AbortSignal cancellation. Logout
  only forgets imported and legacy application keys unless revocation is explicitly requested
  with `--revoke`.

  Add `getStoredAssemblyResults()` for verified completed batches of any retained media, with
  Assembly/step/result/input provenance. Add native `moveStoredAsset()` / `deleteStoredAsset()`;
  moves return the canonical transaction snapshot and preserve existing references.
  `getStoredAssetUrl()` signs exact original bytes through `builtin/storage-serve@0.0.3`, with an
  optional safe Unicode attachment filename and a bounded, cache-rotated lifetime. Requires a
  backend with that Built-in and canonical native mutation responses.

  Add `client.storeImage(filePath, { path })` for one original Storage image without overwriting.
  Stream the input checksum and verify the completed receipt's path, asset ID, stored bytes and
  EXIF-oriented display dimensions. Community-plan transformations may change the stored size/MD5;
  return authoritative result metadata and expose the input comparison through `onReceipt`.
  The CLI warns about changed bytes, saves the receipt and adds bounded debug diagnostics.
  Return typed metadata suitable for saving and rendering without another lookup. Preserve Assembly
  upload progress, cancellation and errors; receipt validation after a write is not a rollback.

  Add `transloadit storage store <file> <path>` using the CLI's existing
  Assembly credentials. Atomically append keyed receipts, preserve previous data on failures and
  reject concurrent writers, then print a ready-to-render Image storage snippet.
  Add `storage store --hashed` for content-addressed filenames: eight MD5 hex digits before the
  extension, with catalog keys, generated types and JSX following the stored path. Retain the local
  filename as `source`; reuse matching full-checksum/size receipts without uploading. Never overwrite
  a hash conflict. Document native catalog recovery in the image reference.
  When receipt validation fails after writing, print the destination and Assembly ID for recovery.
  Point to list/sync, not overwrite or another upload. Report pending browser approval every minute.
  Document npm-first onboarding, browser signup and free-plan watermark behavior.
  Keep receipts-file filesystem errors distinct from JSON validation failures, with the file path.
  Retain a completed temporary catalog on local replacement failures, print the verified receipt,
  and preserve an existing catalog's permissions.

  Add `getStoredImageReceipt({ assemblyId, expected })` to recover the same verified metadata after
  a trusted upload notification or a local file error. Add explicit `store --overwrite` and
  read-scoped `storage ls <prefix>`; overwriting is never implicit.

  Add `storage receipts sync <prefix> --receipts images.json` to recover rendering metadata from
  signed, bounded native catalog pages without per-file HEAD requests, an Assembly or an original
  download. Recover canonical Workspace, asset ID, retained version ID, current path, dimensions,
  MIME and available checksums. Share
  atomic receipt-file writes and credential-bound endpoint resolution with the existing commands;
  preserve unmatched records and the entire previous file on metadata, listing or write failures.
  Record API provenance for every upload, not only hashed uploads, and on the catalog even when
  publication happens before the first upload. Reject API-environment mismatches
  even when Workspace slugs are identical; a custom delivery host is not an API identity. Recover
  unbound legacy receipts into a separate catalog before reviewing and replacing the old file.
  Recovery records the verified API origin so hashed uploads can be reused without uploading.
  Existing rendering catalogs require this recovery before adopting the version-addressed Viewer.
  Redeploy the application to regenerate private capability-v2 URLs; old capability URLs are not
  accepted by the new handler. New Built-ins select actual retained versions, not arbitrary cache tags.

  Add browser device authorization for `auth login`, with bounded polling, cancellation and
  owner-only credential persistence. Keep `--stdin` for an existing Auth Key, verified by a signed read.
  Keep newly entered credentials independent from project dotenv endpoint settings; save an explicit
  trusted endpoint with the key. Add `image init [--public | --private]`, with
  opt-in private `.env.local` scaffolding via `--write-env`. Never overwrite existing application files.
  Default store/sync catalogs to `transloadit.images.json`. Init writes an empty catalog and a runnable example
  for `app` or `src/app`, preserving existing files. Store prints only the saved path and component
  usage; its snippet-only public/private flags and init's dead next flag are removed. Keep upload
  local placeholders on sync only when the canonical asset ID and version ID still match.

  Rename the unpublished image package to `@transloadit/viewer` and expose `Image` with mutually
  exclusive `storage` and `template` selectors and a separate `workspace` prop. Custom HTTP/S3
  Templates do not require a Storage catalog or inherit its publication policy. Keep credentials
  server-only and authorize the full workspace, Template and path identity for private redirects.

  Consolidate the unpublished Next factories into `createImages`; select `public`, `authorize`,
  or `delivery: 'direct'` explicitly. The authorize overload retains its typed redirect handler.
  Require Next 16.3.3 or newer in the peer range.

  Reuse the login workspace and combined Auth Key for optional env scaffolding without extra prompts.
  Add signed public-prefix declaration, revocation and listing methods with `storage publish`,
  `storage unpublish` and `storage publications`. Public image init declares server policy before writing
  files and explains that already cached public bytes cannot be recalled.

  Preserve the device key's signing algorithm in CLI credentials and subsequent API requests.
  Add `signatureAlgorithm` to SDK client options while retaining the legacy SHA-384 default and
  explicit per-call overrides. Init's env setup uses the saved key/workspace/endpoint together,
  independently of stale project or shell credentials. Public/private Template overrides are separate.

  Public init stores workspace and published prefixes in the committed catalog, with no app env file.
  Require public/private intent and bind Storage operations to the selected key's verified workspace.
  Support multi-file store, auth status and server-side auth logout before removing credentials.
  Infer allowed directories from
  public policy even with an empty catalog, and accepts a missing trailing slash. Storage commands
  report the winning credential source without showing credentials; store prints constrained JSX
  bounded to the receipt width. Login makes a bounded read-only Storage policy preflight and gives
  Console advice when unavailable. Keep the image quickstart concise and ship its detailed reference.

- a2c5dd7: Include the Transloadit Storage import and store Robots in the offline catalog and generated
  instructions, and type the optional `asset_id` in Assembly results. Recognize Storage import/store
  error codes in response validation and terminal-status helpers, preserving API errors while polling.
  Sync the canonical `recursive` option for Storage folder imports into the offline linter and
  generated instructions without adding SDK-only schema fields.
- Updated dependencies [a2c5dd7]
- Updated dependencies [a2c5dd7]
- Updated dependencies [a2c5dd7]
- Updated dependencies [a2c5dd7]
  - @transloadit/node@4.13.0

## 0.3.31

### Patch Changes

- 5fe9706: Support GPT-6 Astra and Claude Fable 5.1, and use Astra for automatic chat and assembly-instruction compilation. Assembly compilation retains medium reasoning effort. Existing model identifiers remain supported.
- Updated dependencies [5fe9706]
  - @transloadit/node@4.12.0

## 0.3.30

### Patch Changes

- 76fa652: Stop recommending the retired `builtin/serve-preview` Template for URL inputs.

## 0.3.29

### Patch Changes

- c4cdc23: Update Robot schemas and Assembly status types with the latest supported parameters, formats,
  validation, and status fields.
- 507ec7f: Use GPT-5.6 Sol for OpenAI defaults, Claude Fable 5 for general Anthropic defaults, and Claude
  Sonnet 5 for image descriptions. Keep end-user Assembly Instructions compilation at medium
  reasoning for responsive generation.
- Updated dependencies [c4cdc23]
- Updated dependencies [507ec7f]
  - @transloadit/node@4.11.1

## 0.3.28

### Patch Changes

- c2de344: Release mcp-server and transloadit alongside @transloadit/node.
- Updated dependencies [c2de344]
  - @transloadit/node@4.11.0

## 0.3.27

### Patch Changes

- 9cf7aea: Handle tus upload failures without leaving duplicate internal promises unhandled.
- Updated dependencies [9cf7aea]
  - @transloadit/node@4.10.8

## 0.3.26

### Patch Changes

- f2abe56: Sync robot and assembly status schemas with the latest Transloadit API definitions.
- Updated dependencies [f2abe56]
  - @transloadit/node@4.10.7

## 0.3.25

### Patch Changes

- 910b6d0: Refresh generated Transloadit Robot schemas and shared assembly types from alphalib, including `/document/extract`, FFmpeg v8 stack support, and the latest speech transcription provider defaults.
- Updated dependencies [910b6d0]
  - @transloadit/node@4.10.6

## 0.3.24

### Patch Changes

- 76a51df: Add a `speech transcribe` CLI intent for one-off audio and video transcription.
- Updated dependencies [76a51df]
  - @transloadit/node@4.10.5

## 0.3.23

### Patch Changes

- f2a68fb: Refresh repository dependencies for the Node SDK, the legacy `transloadit` wrapper, and the
  validated MCP server release line.

  This release folds in broad tooling and package updates, security and transitive lockfile refreshes,
  and the test-only replacement of the obsolete `temp` helper with native Node temporary-file APIs.
  `got` and `zod` remain on their current major versions because their latest releases require
  follow-up migration work.

- Updated dependencies [f2a68fb]
  - @transloadit/node@4.10.4

## 0.3.22

### Patch Changes

- 776932f: Release the latest alphalib robot schema sync.

  This updates generated Robot and assembly-status schemas, the public TypeScript type package, and
  the Zod schema package so SDK, CLI, MCP, and schema consumers all see the same validated Transloadit
  API surface.

- Updated dependencies [776932f]
  - @transloadit/node@4.10.3

## 0.3.21

### Patch Changes

- 61a9234: Release the Node SDK, the legacy `transloadit` wrapper, and the validated MCP server together after
  the latest security-maintenance batch.

  This release includes lockfile updates for the `ip-address`, `minimatch`, and `brace-expansion`
  advisories, and the CI coverage-publishing guard that lets Dependabot E2E checks pass when the
  private coverage repository key is unavailable.

- Updated dependencies [61a9234]
  - @transloadit/node@4.10.2

## 0.3.20

### Patch Changes

- e832510: Refresh Node SDK and CLI dependencies, removing unused AWS SDK packages from the published dependency tree while keeping existing API behavior unchanged.
- Updated dependencies [e832510]
  - @transloadit/node@4.10.1

## 0.3.19

### Patch Changes

- 153674b: Add an `image upscale` intent command that wires up the `/image/upscale` Robot for AI image
  upscaling. Flags `--model` (`nightmareai/real-esrgan` by default, plus `tencentarc/gfpgan` and
  `sczhou/codeformer`), `--scale` (2 or 4), and `--face-enhance` are derived from the robot schema.
- Updated dependencies [153674b]
  - @transloadit/node@4.10.0

## 0.3.18

### Patch Changes

- 06fb294: Document and test `gpt-image-2` support in the image generation intent flow.
- Updated dependencies [06fb294]
  - @transloadit/node@4.9.1

## 0.3.17

### Patch Changes

- a6b4233: Add an `image merge` intent command that wires up the `/image/merge` Robot's new `polaroid-stack`
  and `mosaic` collage effects alongside the classic spritesheet modes. Also syncs the updated
  `/image/merge` schema from alphalib.
- Updated dependencies [a6b4233]
  - @transloadit/node@4.9.0

## 0.3.16

### Patch Changes

- f79d2d0: Improve `assemblies create` timeout diagnostics by including the assembly URL when available and
  stabilize the CLI watch-mode test coverage around concurrent assembly updates.
- Updated dependencies [f79d2d0]
  - @transloadit/node@4.8.3

## 0.3.15

### Patch Changes

- 4a63ff7: Improve intent output defaults by inferring local output paths when `--output` is omitted and standardizing intent docs on `--output, -o`.
- Updated dependencies [4a63ff7]
  - @transloadit/node@4.8.2

## 0.3.14

### Patch Changes

- cd662b0: Serve Streamable HTTP MCP requests statelessly so hosted deployments keep working behind non-sticky load balancing while preserving isolated transport instances per request.

## 0.3.13

### Patch Changes

- 28f1a43: Add home-credentials CLI support and release the MCP server alongside the updated Node package.
- Updated dependencies [28f1a43]
  - @transloadit/node@4.8.1

## 0.3.12

### Patch Changes

- aa91113: Add input-guided `image generate` intent support, default image generation to
  `google/nano-banana-2`, and document multi-image prompting by filename.
- Updated dependencies [aa91113]
  - @transloadit/node@4.8.0

## 0.3.11

### Patch Changes

- b716069: Release the alphalib sync from #370 through npm.

  This updates the Node SDK's generated alphalib robot and template types to match the latest sync,
  including new robot schemas and metadata refinements. Release the MCP server alongside it so the
  validated server and SDK surfaces stay aligned.

- Updated dependencies [b716069]
  - @transloadit/node@4.7.7

## 0.3.10

### Patch Changes

- 0702871: Fix "Server already initialized" error when multiple MCP clients connect concurrently. The HTTP and Express handlers now create a new transport + server pair per session instead of sharing a single transport instance.

## 0.3.9

### Patch Changes

- 377bf31: Raise default listRobots limit from 20 to 200 so agents see all robots in one call
- Updated dependencies [377bf31]
  - @transloadit/node@4.7.5

## 0.3.8

### Patch Changes

- 997b917: Add Dockerfile and GHCR publishing workflow

## 0.3.7

### Patch Changes

- 5a07c08: Return friendly 200 JSON for bare GET health probes instead of 406

  Directory crawlers (Glama, uptime monitors) probe MCP endpoints with a plain GET without the required `Accept: text/event-stream` header. Previously this reached the MCP SDK transport which returned an opaque 406 "Not Acceptable". Now the HTTP handler intercepts these non-MCP GETs and returns a `{"name":"Transloadit MCP Server","status":"ok","docs":"..."}` response. Real MCP clients always include the SSE Accept header and are unaffected.

## 0.3.6

### Patch Changes

- Add mcpName field and server.json manifest for Official MCP Registry publishing

## 0.3.5

### Patch Changes

- ddf13ec: Export `./server-card` subpath so consumers can cleanly import `buildServerCard`

## 0.3.4

### Patch Changes

- e11f29f: Fix MCP server card schema and add coverage for `/.well-known/mcp/server-card.json`.

## 0.3.3

### Patch Changes

- 753f76d: Release @transloadit/mcp-server in lockstep when @transloadit/node is updated.
- Updated dependencies [753f76d]
  - @transloadit/node@4.7.4

## 0.3.2

### Patch Changes

- 7b41cb1: Add npm keywords for discoverability.

## 0.3.1

### Patch Changes

- ee1edb7: Improve builtin template discoverability by adding actionable hints to MCP errors and warnings.
- Updated dependencies [ee1edb7]
  - @transloadit/node@4.7.1

## 0.3.0

### Minor Changes

- d045c39: Add token-efficient robot documentation helpers:

  - `transloadit docs robots list|get` CLI commands for offline robot discovery and full docs.
  - `getRobotHelp()` supports `detailLevel: "full"` and exports `isKnownRobot()`.
  - MCP tool `transloadit_get_robot_help` returns full docs and supports requesting multiple robots.

### Patch Changes

- Updated dependencies [d045c39]
  - @transloadit/node@4.6.0

## 0.2.2

### Patch Changes

- 2631623: Allow overriding the Transloadit-Client header and set MCP server requests to its own client name.
- 2631623: Allow appending a client header suffix via TRANSLOADIT_CLIENT_SUFFIX.
- Updated dependencies [2631623]
  - @transloadit/node@4.5.1

## 0.2.1

### Patch Changes

- 56ada34: Document MCP client tool allowlists and keep verification tooling aligned.

## 0.2.0

### Minor Changes

- a5548db: Fetch builtin templates from the API and remove bundled builtin template data.

### Patch Changes

- a5548db: Add MCP client setup docs and a local verification script.
- Updated dependencies [a5548db]
  - @transloadit/node@4.5.0

## 0.1.0

### Minor Changes

- b7795dd: Add Prometheus-compatible metrics endpoint support.

## 0.0.3

### Patch Changes

- 51661f7: Add TRANSLOADIT_ENDPOINT support, make the CLI binary executable, and refresh MCP auth docs.

## 0.0.2

### Patch Changes

- 7128db8: Add a package README so npm shows MCP usage details.

## 0.0.1

### Patch Changes

- 065df19: Add sev-logger based logging with redaction for MCP server, and improve input handling with trusted assembly URLs and configurable URL download restrictions.
- Updated dependencies [065df19]
  - @transloadit/node@4.3.1
