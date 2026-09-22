# SDK Edge bundle regression

## Why

The 4.13.0 release introduced an optional Sharp dependency for local ThumbHash generation.
A customer reported that its Supabase function bundle grew from 8 MB to 26 MB. Sharp's
Linux libvips dependency alone is approximately 18.6 MB, and Supabase does not support
Sharp. Lazy loading and `optionalDependencies` did not isolate ordinary SDK consumers.

Scope: repair the SDK and generated legacy package, prove the packed consumer boundary,
and release through Changesets first. Kevin handles the initial customer reply; follow up
with verified release evidence for the team and Fabian. No API2 production deployment,
Content rollback, or unrelated dependency upgrades.

## Checklist

- [x] Red-first tests: ordinary receipts omit local decoding; both SDK manifests exclude Sharp.
- [x] Remove Sharp from installation and the root SDK import graph (dev-only test fixtures remain).
- [x] No replacement decoder API or CLI flag: keep the urgent patch small; document omitted hashes.
- [x] Test fresh packed installs of both SDK names without Sharp and the Supabase/Deno bundle.
- [x] Keep Storage receipt, orientation, alpha, and Viewer browser coverage green.
- [x] Refresh the generated legacy package and deduplicate the lockfile.
- [ ] Council review; resolve valid findings and run repository checks.
- [ ] Green fix PR, squash merge, review the generated Changesets version PR, release.
- [ ] Verify registry versions, dependency manifests, and post-release consumer smoke tests.

## Review items

No open review comments at branch creation. Findings and release evidence will be recorded here.

Council: Codex and its independent arbiter found one issue: the runtime probe cannot reach
an unforwarded remote Docker host's loopback port. Corrected the documentation to require
locally reachable Docker ports (our CI, Docker Desktop, Colima); no remote-context support
is claimed. This is a documentation correction, not a production-runtime change. Claude's
review was unavailable because its monthly spend limit was reached; no full multi-model
completion is claimed. Logs: /tmp/sdk-edge-proof.Q6s4cJ/council.log.

Local focused suite: 164 tests passed. `yarn check` passed. Existing Vitest/coverage peer
version warnings and Biome informational diagnostics are unrelated to this patch.
Published 4.13.0 reproduces the packaging failure (77 native paths; ~47.6 MB raw ESZIP).
Published 4.12.0 passes for both names (~26.8 MB raw / ~2.24 MB uploaded).
Final packed hotfix passes both Supabase runtime probes without native dependencies:
Node 27,974,695 raw / 2,451,870 compressed bytes; legacy 27,974,512 / 2,457,228 bytes.
The packed Next fixture passed 15 seed tests, 58 browser tests with cacheComponents,
58 without, and 10 dev-mode browser tests. Existing hash, alpha, orientation and private
delivery behavior are covered. These fixtures do not deploy the customer's application.

## Release contract

Patch `@transloadit/node` and `transloadit` together. Repository policy also requires a
matching MCP patch. Keep Viewer at its existing alpha unless runtime changes are needed;
its rendering behavior and existing receipt hashes do not change.

## Separate second round: API2 → receipt → Viewer

Generate ThumbHash where Transloadit already decodes images, not in each SDK consumer.
API2 already extracts BlurHash via output_meta, but that is a different encoding. Add an
opt-in ThumbHash extraction with EXIF orientation, alpha metadata, bounded pixels/time,
and best-effort failure. Store the metadata on the immutable asset version, and preserve it
through stored results, native catalog reads, and SDK receipt recovery/sync. Test both
original uploads and transformed images so placeholders describe the stored bytes.

The metadata belongs on the producing step (upload/handle for original uploads):
transloadit/store uses keepInfo and does not reread output_meta. Existing Smart CDN
delivery Built-ins need no replacement; ingestion is a separate concern. Direct S3 PUT
does not run the Assembly metadata pipeline and needs explicit enrichment if supported.
Review opt-in/pricing semantics rather than silently adding processing charges.

Only after the API2 contract and tests are ready, release SDK/Viewer support through
Changesets. Keep existing hashes compatible, transparent-image behavior, and the private
image rule against embedding unauthorized pixels. Remove the existing Viewer diagnostic
that tells users to generate a missing hash locally in that follow-up release.

Research and local reproduction evidence: /tmp/sdk-edge-proof.Q6s4cJ/placeholder-research.md.
