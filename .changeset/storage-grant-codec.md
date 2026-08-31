---
'@transloadit/utils': minor
---

Add the storage-grant contract/codec: `StorageGrantClaims` types, `parseStorageGrantClaims`, browser-safe `decodeStorageGrant`, `normalizeStorageGrantPrefix` at the root, and deterministic HS256 `signStorageGrant`/`verifyStorageGrant` under `@transloadit/utils/node` — one wire contract for the grants minted by api2/integrator servers and verified by Companion's S3 provider.
