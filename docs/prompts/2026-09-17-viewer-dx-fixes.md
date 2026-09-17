# Viewer DX review follow-up

Why: the independent September 17 reader test proved the public Storage path, but found an
inconsistent Template image layout and misleading CLI field selection. The general CLI README
also needs to lead with browser login. Keep the agreed Image API; do not introduce a source registry.

PR: https://github.com/transloadit/node-sdk/pull/500

## Checklist

- [x] Read PR description, comments and reviews: no unresolved review threads.
- [x] Fetch and merge latest main (already included on September 17).
- [x] Red-first: constrained responsive defaults for string, receipt and catalog sources;
  explicit `layout="none"`, sizes and style overrides remain available.
- [x] Red-first: `templates list --fields id,name --json` returns only selected fields.
  Pattern sweep found the same issue in `assemblies list`; fixed with its own failing test.
- [x] Lead the general CLI Quick Start with `auth login`; document manual/CI alternatives.
- [x] Root `yarn check`: 344 image and 641 Node tests pass (one existing Node skip);
  147 targeted layout/list tests pass. The legacy wrapper README is regenerated.
- [x] Initial packed Chromium/WebKit fixture: 126 cases pass; exact-head CI at `6469d83` green.
- [x] Council findings reproduced red-first: enforce public Built-in limits in low-level unsigned
  candidates, and retain compatible signed delivery for old private capabilities beyond those
  limits after publication. Use one shared exact-template limits helper. Replace the mobile
  assertion loop with collection assertions while preserving fractional-pixel tolerance.
- [x] Follow-up root check: 347 Viewer, 63 utils and 641 Node tests (one existing Node skip).
- [x] Public-limit corrections: packed fixture passes all 126 cases and GitHub CI passes on
  `d8217df`. A further council found a signed-fallback authorization bypass when local publication
  policy lags server-side revocation. Reproduce all three out-of-public-range cases red-first,
  then require authorization for every signed redirect, regardless of local publication.
- [x] Final authorization fix: root check and all 126 packed browser cases pass. Follow-up council
  found only callback-documentation ambiguity; document that signed compatibility renditions still
  call the authorizer after publication and link the mixed-delivery explanation.
- Exact-head GitHub CI remains a live merge gate; see the current PR checks, not an older green head.

## Cross-repository work

- API2 #9057: recover a persisted signup when verification mail throws, without bypassing
  verification or weakening the local recipient guard. Test false returns and exceptions.
- Content #5973: recover into verification instead of repeating signup; test pending-user
  security boundaries, browser UX and the newly packed Viewer.
- Uppy does not participate in these four fixes. No npm publication, production deployment,
  migration application or merge into main is authorized by this follow-up.

Evidence: `/tmp/viewer-dx-fixes-20260917.x7BDzj/`. Original independent review and parent
reconciliation: `/tmp/viewer-dx-astra-20260917.AhRBGF/`. The assisted first-pixel timing was
not a clean signup benchmark; the mail exception was confirmed locally, not in production.
