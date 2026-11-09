# Supabase Edge fixture cache mitigation

## Why and scope

Main's intermittent exit 135 is a native Supabase/Deno cache-initialization race,
not a return of the native SDK image dependency. Three x64 crash dumps identify
SQLite WAL access after cache database replacement. A local one-line CommonJS
package with no Transloadit dependencies reproduces the failure in 6/90 runs.

Keep the pinned runtime and the entire packed-consumer regression gate. Give
only the bundler's Deno cache a fresh, bounded 256 MiB tmpfs per container. This
passed 90/90 diagnostic trials, but remains a mitigation of an upstream race,
not a claim to fix the runtime. No warm/shared cache and no crash retries.

The diagnostic branch `edge-crash` replaces CI for investigation and must never
be merged. This branch starts from latest main and carries none of that machinery.
No package runtime, dependencies, release versions, credentials, or deployment
changes are needed. A package changeset is not appropriate for this fixture fix.

## Checklist and review items

- [x] Inspect prior CI evidence, native dumps, upstream source and minimal control.
- [x] Start the fix from current main; leave other checkouts untouched.
- [x] File a reduced, credentials-free upstream issue after checking duplicates:
  https://github.com/supabase/edge-runtime/issues/746.
- [x] Red-first regression for the Docker cache invocation contract: the new test
  fails solely on the missing tmpfs arguments (`/tmp/sdk-edge-cache-red.log`).
- [x] Add the bounded disposable cache and keep existing product assertions.
- [x] Full local packed consumers: both package names, native-dependency and size
  budgets, actual HTTP execution and HMAC verification. Node: 28,025,947 raw /
  2,454,583 upload bytes; legacy: 28,025,764 / 2,459,280 bytes. Both have zero native
  image dependencies. Log: `/tmp/sdk-edge-cache-packed.log`.
- [x] Council review and reconcile findings: one P2 in the regression test,
  reproduced with an intentionally misplaced Docker image argument. The original
  test missed it; the corrected test fails on that mutant and passes after
  restoring the valid invocation. No runtime change was needed after review.
- [x] Repeat full repository verification after review: `corepack yarn verify:full`
  passes, including package tests, wrapper sync, Knip and generated type checks
  (`/tmp/sdk-edge-cache-verify-full.log`).
- [x] Green x64 PR run with retained artifact evidence; no blind failure retries.
  All checks passed on `c7ed9422e253af635a0a3631aad59eca62449ef1` in
  https://github.com/transloadit/node-sdk/actions/runs/35828672200, including the
  packed Next browser fixture, release dry run, all supported Node versions and
  both real Supabase package probes. CI measured zero native files and upload
  sizes of 2,456,058 bytes (Node) / 2,450,115 bytes (legacy). Both containers exit 0.
- [x] Update node-sdk#510 with the cause, upstream link and validated mitigation:
  https://github.com/transloadit/node-sdk/issues/510#issuecomment-5790411458.

No review comments existed at branch creation. Review and CI outcomes will be
recorded here. The API2 #9191 merge is a separate authorized operation; neither
production deployment nor npm release is authorized by this task.

Pre-review `corepack yarn check` passes. Existing Biome informational diagnostics
and the existing unused-variable warning are unchanged. Log:
`/tmp/sdk-edge-cache-check.log`.

The negative control `test:sdk:edge --version 4.13.0` still fails on its 77 native
image paths with the tmpfs enabled. This confirms the original bloat gate is
retained (`/tmp/sdk-edge-cache-bloat-control.log`). Council log:
`/tmp/sdk-edge-cache-council.log`; mutation evidence:
`/tmp/sdk-edge-cache-mutant-{before,red}.log`.

## Follow-up gates

After API2 #9191 lands: deploy its main build together with the prior placeholder
migration, verify real upload → catalog → receipt → Viewer behavior, then use the
Changesets release PR for SDK/Viewer publication and dogfood in Content.
