# @transloadit/viewer

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
