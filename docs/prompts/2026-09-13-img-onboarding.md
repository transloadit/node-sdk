# Round 7 onboarding review

Why: the public-image quickstart must remain secretless from login through the first image,
and errors must describe the API's actual wire contract.

PR: https://github.com/transloadit/node-sdk/pull/500

- [x] Diagnose unpublished paths via `Transloadit-Error: NO_SIGNATURE_FIELD`; retain generic
  HTTP 400 advice and path/template advice for 404.
- [x] Infer allowed public prefixes with an empty catalog; preserve explicit deny-all policies.
- [x] Public init writes only the workspace; private init retains rendering credentials.
- [x] Print bounded, constrained JSX from store and disclose the selected credential source.
- [x] Rename the policy listing command, normalize init prefixes and preflight Storage after login.
- [x] Keep the quickstart focused and reference details separate; qualify test and byte counts.
- [ ] Run sequential package/repository/browser checks, review and exact-head CI.
- [ ] Test the real login key with List + HEAD sync and a fresh public-only Next app in devdock.

No merge or publication in this round. No blur placeholder, origin version selector, workspace
picker or logout implementation. API2 owns the S3 eligibility and error-header changes; Console
owns real browser approval. Local canaries do not establish production Bunny latency.
