# Contract workflow finality follow-up for #517

October 4 final confirmation/tus correction, still draft and unmerged:

- [x] Complete the combined source-access-verified council. A P2 cloned-response cleanup timeout
      discarded tus HTTP status/backoff; a P3 invalid confirmation body discarded the failed
      DELETE diagnostic in both SDKs. Seventeen Node and two Go fail-first failures reproduce
      these defects before changing implementation.
- [x] Treat confirmation reading and inspection as one failure boundary. Keep active/aborted
      confirmation behavior and caller/deadline precedence; never repeat cancellation.
- [x] Retain tus HTTP failure status/backoff and request-timeout cause across body cleanup, while
      explicit caller/workflow cancellation still wins. Nine POST/HEAD/PATCH and 403/429/503
      cases plus three cloned-body caller-abort controls pass. All 287 focused cases pass.
- [x] Full post-fix `yarn check` passes: 1,180 Node tests with one existing skip, plus remaining
      monorepo suites. The generated legacy wrapper README is synchronized mechanically.
- [ ] Repeat packed consumers; freeze sources, refresh producer pins, repeat local API2/tusd
      acceptance and post-fix council, then monitor exact-head CI. Final receipts supersede this
      pre-push snapshot; no merge, release or additional live-reader budget.

October 4 final diagnostics review, still draft and unmerged:

- [x] Source-access-verified combined council found a pre-header abort-identity defect. Four
      fail-first tests reproduce a caller's `TypeError` being wrapped before or during fetch,
      both with and without the SDK's own request timeout. The already-aborted case uses native
      fetch against a loopback endpoint and sends no network request.
- [x] Reconcile explicit caller/workflow cancellation once at the transport rejection boundary.
      Preserve HTTP status/backoff for SDK-owned request timeouts and detach request listeners.
      All 265 focused native/shared workflow cases pass after the repair.
- [x] Full post-repair `yarn check` passes: 1,158 Node tests and one existing skip, plus the
      remaining monorepo suites. No generated-client bytes or existing API shapes changed.
- [ ] Repeat both strict packed consumers; freeze the native commit and refresh the producer pin.
      Re-run local API2/tusd proof, post-fix council and exact-head CI. Completion receipts belong
      in the PR and canonical living record; these pending boxes are the pre-push snapshot.

October 4 identity follow-up, still draft and unmerged:

- [x] Merge current main and regenerate from the integrated API2 contract.
- [x] Reproduce malformed Base64, invalid UTF-8 and extra-token acceptance before changing decoding.
- [x] Consume source-owned tus identity grammar and receipt roles; compare owned values as bytes.
- [x] All 26 shared metadata/receipt cases and 101 focused tests pass, as does full `yarn check`.
- [ ] Complete both strict packed consumers, updated source-pin/local runtime proof, fresh council
      and exact-head CI. Historical acceptance below does not certify this candidate.

October 4 council corrections, still draft and unmerged:

- [x] Reproduce broken error-body backoff and lost cancellation-response confirmation before fixes.
      Preserve received HTTP status/delay and original causes; never repeat DELETE, and never hide
      its error behind active or `REQUEST_ABORTED` confirmation.
- [x] Execute all 32 shared metadata/receipt cases, including repeated header fields, empty-file
      counts and a normalization alias that must not count as an admitted receipt. The alias case
      failed in Node before correction and passed in Go.
- [x] Restrict 409 recovery to tus, not ordinary Assembly discovery, with a failing test first.
- [x] Document proxy receipt rewriting and simple upload-ID restrictions, and explicitly describe
      legacy zero/exhausted polling budgets in the changeset. Generate public return annotations
      and structural tus policy conformance from API2, not by editing generated TypeScript.
- [x] Full `yarn check` passes: 1,140 Node tests pass, with one existing skip. Both packed consumers
      pass strict installed compilation after retrying a transient registry socket failure.
- [x] Freeze `bb5a2e4391`, refresh API2 pins and pass the actual local API2/tusd canary. Exact-head
      CI `37186698130`, attempt 2, is green; only an external Edge image-download quota failure
      was retried. Healthy combined council accepts two P3 diagnostics findings, not the later repairs.
- [x] Reproduce caller-abort masking and lost DELETE diagnostics before fixes. Preserve caller-abort
      identity and retain both failed DELETE and confirmation GET in
      `AggregateError`; caller cancellation and the overall deadline still win. Focused tests pass.
- [x] A follow-up three-case regression reproduces lost HTTP status/backoff if the SDK's own request
      timeout wins after receiving error headers. Keep that timeout as the HTTP error cause; only
      explicit caller/workflow cancellation wins outright. Go already preserves both properties.
- [x] Full post-repair `yarn check` passes: 1,154 Node tests pass, with one existing skip. Both
      caller-abort-during-confirmation controls and Go's mirrored cause/deadline checks pass.
- [ ] Freeze the new candidate, update producer pins/runtime proof and
      complete the fresh post-fix council and exact-head CI. Earlier green heads are not approval.

The receipt-field follow-up below is historical: fields now come from API2's Status owner through
the contract. The deployed raw parser, legacy SDK APIs and live-reader resource budgets are unchanged.

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
