---
"@transloadit/node": minor
"transloadit": minor
"@transloadit/mcp-server": patch
---

Add `client.storeImage(filePath, { path })` for one original Storage image without overwriting.
Stream the checksum and verify the completed receipt, including path, asset ID, bytes and
EXIF-oriented display dimensions.
Return typed metadata suitable for saving and rendering without another lookup. Preserve Assembly
upload progress, cancellation and errors; receipt validation after a write is not a rollback.

Add `transloadit storage store <file> <path> --receipts images.json` using the CLI's existing
Assembly credentials. Atomically append keyed receipts, preserve previous data on failures and
reject concurrent writers, then print a ready-to-render StorageImage snippet.
When receipt validation fails after writing, print the destination and Assembly ID for recovery.
Keep receipts-file filesystem errors distinct from JSON validation failures, with the file path.
Retain a completed temporary catalog on local replacement failures, print the verified receipt,
and preserve an existing catalog's permissions.

Add `getStoredImageReceipt({ assemblyId, expected })` to recover the same verified metadata after
a trusted upload notification or a local file error. Add explicit `store --overwrite` and
read-scoped `storage ls <prefix>`; overwriting is never implicit.

Add `storage receipts sync <prefix> --receipts images.json` to recover rendering metadata from
signed, paginated List + HEAD reads without an Assembly or original download. Rebuild
path/width/height with an optional compatible MD5 ETag, without inventing an asset ID. Share
atomic receipt-file writes and credential-bound endpoint resolution with the existing commands;
preserve unmatched records and the entire previous file on metadata, listing or write failures.

Add browser device authorization for `auth login`, with bounded polling, cancellation and
owner-only credential persistence. Keep `--stdin` for an existing Auth Key, verified by a signed read.
Keep newly entered credentials independent from project dotenv endpoint settings; save an explicit
trusted endpoint with the key. Add `image init [--public | --private]`, with
opt-in private `.env.local` scaffolding via `--write-env`. Never overwrite existing application files.
Default store/sync catalogs to `images.json`. Init writes an empty catalog and a runnable example
for `app` or `src/app`, preserving existing files. Store prints only the saved path and component
usage; its snippet-only public/private flags and init's dead next flag are removed. Keep upload
asset IDs and sizes on sync only when the HEAD MD5 still matches the stored receipt.

Consolidate the unpublished Next factories into `createStorageImages`; select `public`, `authorize`,
or `delivery: 'direct'` explicitly. The authorize overload retains its typed redirect handler.
Require Next 16.3.3 or newer in the peer range.

Reuse the login workspace and combined Auth Key for optional env scaffolding without extra prompts.
Add signed public-prefix declaration, revocation and listing methods with `storage publish`,
`storage unpublish` and `storage public`. Public image init declares server policy before writing
files and explains that already cached public bytes cannot be recalled.

Preserve the device key's signing algorithm in CLI credentials and subsequent API requests.
Add `signatureAlgorithm` to SDK client options while retaining the legacy SHA-384 default and
explicit per-call overrides. Init's env setup uses the saved key/workspace/endpoint together,
independently of stale project or shell credentials. Public/private Template overrides are separate.
