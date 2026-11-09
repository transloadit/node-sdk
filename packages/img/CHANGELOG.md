# @transloadit/viewer

## 0.1.0

### Minor Changes

- df7f1d8: Viewer now uses the direct-encode Storage previews: `builtin/storage-preview@0.0.4` for private
  delivery and `builtin/public-preview@0.0.3` for public delivery. Both preserve the exact asset and
  version, with no path-based fallback. Public previews retain their 4096px and quality-85 limits.

  Breaking (Viewer alpha): these replace the previous preview pins. Remove overrides for older
  Storage preview Built-ins; no legacy-version adapter is provided. Deploy the new API2 Built-ins and
  their worker/FileInfoReader dependencies before adopting this release. Custom non-Storage Templates
  and original/download delivery are unchanged.

### Patch Changes

- Updated dependencies [df7f1d8]
  - @transloadit/utils@4.10.1

## 0.0.8

### Patch Changes

- f02b313: Add an optional native React Video component for exact Storage receipts. Private range failures renew through the existing authorized app route while preserving position and playback intent; refused renewal and decode failures do not loop or fall back to public media.

## 0.0.7

### Patch Changes

- b0d0a7c: Keep image-preview blur and loading feedback visible until native image decoding completes, avoiding a blank frame between download and display. Ignore late decode results after navigation and preserve the error fallback for invalid images.

## 0.0.6

### Patch Changes

- b4a6160: Add an opt-in client ImagePreview with immediate ThumbHash/loading/error feedback and ImagePrefetch
  for warming one neighboring photo at low priority. Native React Image now forwards onLoad/onError.
  Prefetch waits for hydration and skips Save-Data/slow connections. Navigation, neighbor selection,
  current-image readiness and authorization remain owned by the consuming app.
  Previews preserve receipt geometry and centered feedback on errors, with quiet optional blur
  fallbacks. Invalid receipt errors name the field and expected format; the React guide includes a
  valid fixture and an explicit pre-release installation path.
  Prefetch attaches the complete picture before enabling eager loading, avoiding an extra JPEG
  fallback request in WebKit.

## 0.0.5

### Patch Changes

- 716a2fe: Add an optional `rotationIntervalMs` to `createStorageRoute` for longer reuse of signed CDN URLs.
  The default interval, maximum grant lifetime, and per-request authorization remain unchanged.
  The interval cannot exceed half the lifetime, keeping newly issued URLs usable for at least
  half their maximum lifetime. Viewer remains alpha.

## 0.0.4

### Patch Changes

- 215c286: Clarify native automatic image sizing in Safari 27 and preserve guidance for older-browser fallbacks and eager heroes. Rendering behavior is unchanged.

## 0.0.3

### Patch Changes

- dc7d42d: Add alpha React receipt images and a Web-standard Storage authorization route. Each preview,
  original, and download request checks live application access before redirecting to an exact
  retained version, with a finite rendition policy and private no-store responses.

  React receipt images support opt-in ThumbHash blur placeholders with the same bounded decoder
  as Next, without native dependencies or load handlers. Preview metadata must be authorized before
  returning it to the browser; alpha and letterboxed images stay empty, and request-authorized
  Next images continue to omit inline preview pixels.

  Expose strict, pure retained Assembly result extraction through narrow Zod v3/v4 entries and
  reuse it in the Node SDK, preserving receipt provenance and failed-Assembly errors. Utils and
  Viewer gain no runtime dependencies.

## 0.0.2

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

## 0.0.1

### Patch Changes

- 78de89e: Publish the first alpha of `@transloadit/viewer`: native responsive images from Transloadit Storage
  or an origin-pinned HTTP/S3 Smart CDN Template, with a Next.js Server Component and a resolved-model
  renderer. Image bytes go directly from Smart CDN to the browser.

  This is an early, images-only API that may change between releases. Install the `alpha` tag and pin
  the exact version. Storage and browser CLI login require the matching backend and Console rollout;
  an existing compatible HTTP/S3 Template does not require a Storage migration.

- Updated dependencies [a2c5dd7]
- Updated dependencies [a2c5dd7]
- Updated dependencies [a2c5dd7]
  - @transloadit/utils@4.9.0
