# Viewer preview: independent integration follow-up

PR: https://github.com/transloadit/node-sdk/pull/566

This is the bounded review checklist, not a second DAM roadmap. The cross-repo plan remains
[API2's DAM document](https://github.com/transloadit/api2/blob/main/docs/prompts/2026-10-15-handover-dam.md).

Opus 5.5 independently integrated head `006c859a` into a new Next.js consumer: 38 browser
assertions passed against local mock media. First rendered markup took 3m04s and the behavioral
pass took 6m18s of agent wall-clock time, not estimated human onboarding time. No real CDN
latency or production authorization was tested. GitHub had no open review threads.

- [x] Preserve intrinsic geometry and centered feedback when preview delivery fails; also respect
  a caller-sized frame. Cover both with a browser regression.
- [x] Keep optional preview ThumbHash fallback quiet; preserve diagnostics for explicit blur requests.
- [x] Name invalid receipt fields and their expected format without exposing supplied values;
  document a valid local fixture and retain the existing validation rules.
- [x] State the preview entry's version floor and an executable pre-release tarball workflow.
  Do not claim that the old registry alpha already includes the entry.
- [x] Reconcile council and Opus follow-up findings and run required repository checks.
- [x] Preserve the one-neighbor request bound in WebKit: mount the complete hidden picture before
  enabling eager loading. Keep the real browser regression strict rather than ignoring its extra
  fallback download.

Post-fix evidence: the same consumer keeps identical loading/error heights at 1280×800 and
390×844, with centered feedback and no unexpected browser errors or warnings. Opus 5.5
independently confirmed the screenshots and clarified parent sizing. The documented tarball
installation and export check ran successfully; registry `alpha` remained 0.0.5 during this test.
Full `yarn check` passes, including 493 Viewer tests. New-head CI is tracked on the PR, not inferred
from its earlier green run.

The new successful-prefetch browser regression first failed on WebKit in CI and locally: the
detached eager image requested a JPEG fallback before choosing its picture source. After the mount
ordering fix, the same assertion passes in Chromium and WebKit. The packaged fixture passes all
78 production checks with Next's cache components enabled and all 78 without them, plus 10
development checks. These local fixture results are not a substitute for new-head CI.

Council reconciliation: the geometry finding against the previous commit is covered by this
update; missing IDs retain the receipt-sync remedy, distinct from malformed-ID errors; the cached
image test now hydrates server markup, and the browser fixture covers successful readiness and a
real neighbor request. Optional ThumbHash aspect-ratio approximation remains intentional: stretching
the blur to fill a caller-sized frame would also paint its letterbox bars. It disappears on load.

Release is separate: publish the Viewer patch before any consuming demo pins it. No package
publication, product merge, production deployment, or repeat workspace-plan change is part of this review.
