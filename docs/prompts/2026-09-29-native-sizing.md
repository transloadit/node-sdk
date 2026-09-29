# Native Viewer sizing verification — September 29, 2026

Viewer 0.0.3 already uses native automatic sizing for lazy images. This slice changes documentation
and browser coverage, not rendering, signing, grants, Templates or production configuration.

## Evidence

The packed Next fixture passes 74 browser cases with Cache Components enabled, 74 without it, and
10 development cases. The new cases compare Viewer against an independently loaded native image
in a cold browser context, at 1× and 2× DPR. A shared warm context was deliberately rejected as a
comparison: Chromium can legitimately reuse an already-cached larger candidate.

Both production builds measured these actual response bodies for a 240px CSS box:

| Pinned engine | DPR | Automatic candidate / bytes | Explicit 960px fallback / bytes |
| --- | --- | --- | --- |
| Chromium | 1 | 320px / 208 | 960px / 1,174 |
| Chromium | 2 | 640px / 572 | 1,920px / 4,450 |
| WebKit | 1 | 960px / 1,174 | 960px / 1,174 |
| WebKit | 2 | 1,920px / 4,450 | 1,920px / 4,450 |
| Firefox 146 | 1 | 960px / 1,174 | 960px / 1,174 |
| Firefox 146 | 2 | 1,920px / 4,450 | 1,920px / 4,450 |

These are synthetic WebP fixture bytes, **not a prediction of production photo savings**. The
older Playwright 1.58.2 Firefox/WebKit engines verify the fallback contract, not Safari 27 or
Firefox 150 support. Safari 27 support is documented by
[WebKit](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/#responsive-images); the
installed macOS Safari is 26.6.2. Existing native hero/preload, redirect, art-direction, alpha,
denial/revocation and developer-diagnostic cases remain green.

Reports are reproducible with `yarn test:img:fixture`; its `native-sizing` attachments record
selected URLs, response bytes and dimensions in `test-results/img-next/{enabled,omitted}`.
Local verification used Node 24.21.0. Node 26.8.2 stalled while extracting the Firefox download;
that failed attempt was not counted as browser proof. Full `yarn check` passed before final review.

## Consumer audit

Content's published Viewer-backed bridge has deliberate explicit size contracts: 24/64/128px
teammate avatars, 28/40px customer portraits, bounded article layouts, robot variants, and hero
preload/media branches. Removing those values would worsen older-engine fallbacks or lose preload
precision. No blanket rewrite is warranted. Convex's owner is auditing its grid/fullscreen sizing
alongside its separate gallery-performance PR; preserve useful explicit grid fallbacks.

## Release / ownership

This patch follows Changesets and remains a Viewer alpha; no package has been published or merged
as part of the verification. No API2, Built-in or Terraform changes are needed. The borrowed
`~/code/node-sdk` checkout must return to its owner's `sdk-contract` branch after pushing and
verifying this PR. Content's living sequence is `repodocs/prompts/2026-09-29-storage-next-slices.md`.
