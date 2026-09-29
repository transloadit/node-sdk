# Contract workflow finality follow-up for #517

Why: runtime investigation distinguished a finite client outcome from backend cleanup. The user
approved returning typed `REQUEST_ABORTED` from ordinary waiting, while still attempting explicit
cancellation and preserving a failed cancellation request. This is not merge/release approval.

- [x] Read PR context; no outstanding review threads. Preserve existing SDK APIs and native tus safety.
- [x] Reproduce the new lifecycle cases against the old implementation before changing it.
- [x] Implement finite ordinary wait, explicit cancel after an aborted connection, and preservation
      of a failed DELETE when a later GET still reports `REQUEST_ABORTED`.
- [x] Merge latest main, including the Viewer changes and release; immutable install passes.
- [x] Regenerate from committed API2 producer `f13c20fe24`; generated contract SHA-256
      `a72c65901795052a96036a2fa6beed7ac1885299fb3d6dfec8a011e2efc6f819`.
- [x] All 216 focused native/shared tests and full `yarn check` pass. Both packed package names
      pass strict installed-consumer compilation, including exact optional properties and no
      skipped declaration checks. The workstation Yarn wrapper selects Node 26; CI covers its
      configured runtime matrix separately.
- [x] Exact-head CI on `2c29613e2ad2651399a5c632ca5569b5d3de7da7`: all 11 checks pass in
      run `36625686355`, including the Edge fixture and Node 20/22/24. The previous registry quota
      failure and stale generated wrapper README are resolved on this head.
- [x] Triage the completed Opus report: synchronize the generated wrapper, document that uploader
      origins are additive, and explain that upload deadlines include hashing and persistence.
      Correct the PR's claim that legacy behavior is unchanged: the separately tested polling
      deadline repair also affects `createAssembly` and `resumeAssemblyUploads`. The changeset
      already describes that behavior change.
- [ ] Complete multi-model council. This attempt's Codex reviewer and arbiter hit provider quota;
      the Opus report alone is not council approval. Retry when capacity is available.
- [ ] Post-documentation checks and exact-head CI.

Review dispositions: preserving the synchronous `client.contract()` API requires its runtime
dependency; a dynamic import would change that API. Most generated source is erased types, so
source-file size is not an import-cost measurement. Keep the opt-in subpath and existing root
compile checks. This checklist is maintainer documentation, not shipped API/schema prose. Receipt
field names remain an explicit next producer-policy follow-up, with real-server receipt acceptance
already covered; do not duplicate that inventory in another test adapter.

Canonical program history and cross-repository receipts remain in API2's
`docs/prompts/2026-07-09-handover-sdks-branch-restructure.md` on `sdk-next`.
No new live credentialed tests, merge or release in this follow-up.

https://github.com/transloadit/node-sdk/pull/517
