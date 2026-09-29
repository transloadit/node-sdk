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
- [ ] Council-review, fix valid findings, rerun checks, push and monitor exact-head CI.

Canonical program history and cross-repository receipts remain in API2's
`docs/prompts/2026-07-09-handover-sdks-branch-restructure.md` on `sdk-next`.
No new live credentialed tests, merge or release in this follow-up.

https://github.com/transloadit/node-sdk/pull/517
