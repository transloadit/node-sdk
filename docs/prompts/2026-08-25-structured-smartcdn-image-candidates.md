# Structured Smart CDN image candidates

## Why

`getSignedSmartCdnImageCandidates()` was introduced on 2026-08-24 with renderer-specific `srcset`
strings. Content and its generated Website mirror are its only application consumers. Replace that
young contract before broader adoption so the signing helper returns ordered, serializable data and
renderers retain ownership of HTML serialization.

## Pull request checklist

- [x] Inspect the complete context for [node-sdk #475](https://github.com/transloadit/node-sdk/pull/475).
- [x] Confirm there are no open review threads or human review comments.
- [x] Return exported structured sources with format, quality, URL, and width data.
- [x] Remove the renderer-specific return shape without compatibility scaffolding.
- [x] Add a patch changeset that explicitly documents the intentional replacement.
- [x] Run `corepack yarn workspace @transloadit/utils check`.
- [x] Run `corepack yarn check`.
- [x] Run `corepack yarn verify:full`.
- [x] Run `corepack yarn release:pack:dry-run`.
- [x] Run council review. Its sole finding requested major-version treatment; this was deliberately
      rejected under the verified zero-external-consumer exception for APIs introduced in the last
      two days.
- [ ] Confirm every GitHub check passes.
- [ ] Squash-merge node-sdk #475.
- [ ] Land the generated Version Packages PR and verify the patch on npm.
- [ ] Migrate Content to the exact released version and complete its browser/network validation.

## Contract

The utility owns deterministic signing and returns structured candidates. Content and the eventual
`@transloadit/img` renderer turn those candidates into `srcset` strings. Geometry and crop policy
remain unchanged until a real caller proves the next capability.
