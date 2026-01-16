# TODO

## Compatibility verification (byte-for-byte)
- [x] Baseline: run `npm pack` or `yarn pack` from current `transloadit`
- [x] Record tarball SHA256
- [x] Record file list + sizes + per-file SHA256 inside tarball
- [x] Record `package.json` fields that affect install (name, version, main, types, exports, files)
- [x] After refactor: run `yarn workspace transloadit pack`
- [x] Compute same fingerprint
- [x] Assert byte-for-byte identity

## Fingerprint script
- [x] Add `scripts/fingerprint-pack.js`
- [x] Use `npm pack --json` to get tarball name
- [x] Hash the tarball SHA256
- [x] Hash each file via `tar -tf` + `tar -xOf`
- [x] Output JSON artifact for comparison
- [x] Support `node scripts/fingerprint-pack.js .`
- [x] Support `node scripts/fingerprint-pack.js packages/transloadit`

## Versioning and releases
- [x] Add Changesets at workspace root
- [x] Use `yarn changeset` for changes
- [x] Use `yarn changeset version` to bump versions
- [ ] Use `yarn changeset publish` to publish packages
- [x] Keep `transloadit` and `@transloadit/node` versions synchronized
- [x] Decide whether `@transloadit/types` tracks same version or diverges

## Implementation phases
### Phase 1: monorepo scaffolding
- [x] Add root workspace config
- [x] Add Changesets config
- [x] Add base tsconfig
- [x] Move current package to `packages/node`
- [x] Ensure existing build/test scripts still pass

### Phase 2: @transloadit/types (re-export alphalib)
- [x] Keep alphalib as synced source of truth
- [x] Re-export from `src/alphalib/types` via TS path mapping or barrel files
- [x] Build `.d.ts` only, no runtime JS

### Phase 3: @transloadit/zod
- [x] Generate Zod schemas in `packages/zod` from alphalib types
- [x] Depend on `zod`

### Phase 4: transloadit wrapper
- [x] Publish identical output to `@transloadit/node`
- [x] Copy dist + transform `package.json`
- [ ] Confirm publish via Changesets

### Phase 5: compatibility validation
- [x] Record baseline fingerprint from current `transloadit`
- [x] Validate refactor output matches baseline (except package name if applicable)

## Cross-repo validation
- [x] Trial the updated robot schemas in alphalib within `~/code/content` and `~/code/api2`, then run `yarn check` in both repos

## Refactors
- [x] Unify pack/build orchestration into a single script used by CI + local pack
- [x] Align `@transloadit/types` export map with the generated layout (keep subpath imports stable)
- [x] Centralize Zod sync export list/extension to avoid drift
- [x] Document inline heavy-inference casts (helper wrappers trigger TS7056)
- [x] Keep legacy `transloadit` metadata synced from `@transloadit/node` with one source of truth

## Zod v4 parity hardening
- [x] Add runtime parity fixtures by copying proven Assembly Instructions from `~/code/content` (stepParsing fixtures)
- [x] Add a sync-v4 regression fixture to verify `.passthrough()` → `.catchall(z.unknown())` and `z.record(...)` key injection
- [ ] Add runtime parity coverage for `assemblyStatus` (ok/error/busy) once stable samples are selected
- [x] Add a CI guard that `@transloadit/zod` exports list stays in sync with `packages/node/src/alphalib/types`
