# Storage image onboarding and delivery

## Why

Finish the private, unpublished `@transloadit/img` integration in node-sdk #500. One original,
one typed catalog and one factory should serve public marketing images and authorized private
images without proxying image bytes through Next.

## Contract

- One `createStorageImages` factory; explicitly choose public prefixes, an authorizer or direct delivery.
- Declared-public prefixes use permanent unsigned Smart CDN URLs; private delivery keeps bounded
  signatures, native-cookie authorization and opaque redirect capabilities.
- Browser CLI login saves a server-only Auth Key and workspace; init creates a runnable example
  and catalog. Store validates upload evidence; sync preserves it only when the MD5 agrees.
- Device creation and token polling send form-urlencoded fields; approval uses signed API params.
  Public directory declarations are bounded to 512 UTF-8 bytes, including their trailing slash.
- Public delivery requires the matching API2 public-prefix contract and public Built-ins.
  API2 and Console implementation are separate work; test SDK boundaries with contract fakes
  until the owned devdock is updated.
- Preserve strict path scope, transparent previews, EXIF dimensions, catalog types and native
  responsive layout. No arbitrary-origin loader, application byte proxy or silent overwrites.

## Verification and release gates

Write failing regressions first. Run package checks, repository verification and the packed Next
fixture in both Cache Components modes with Chromium/WebKit. Reconcile independent council and
security findings; verify exact-head GitHub CI. Then test actual device approval, public/private
delivery and the Content hero against the owned devdock.

Keep detailed session evidence outside the repository. Maintain reproducible consumer instructions
in the package README and `docs/img-dogfood.md`. Do not merge or publish without Kevin's approval.
Before release, coordinate API2/Console deployment and matching utils/types/node/img versions,
ordinary registry installs, sustained Content dogfood and timed tests with real developers.
