# @transloadit/node

## 4.8.1

### Patch Changes

- 28f1a43: Add home-credentials CLI support and release the MCP server alongside the updated Node package.

## 4.8.0

### Minor Changes

- aa91113: Add input-guided `image generate` intent support, default image generation to
  `google/nano-banana-2`, and document multi-image prompting by filename.

## 4.7.7

### Patch Changes

- b716069: Release the alphalib sync from #370 through npm.

  This updates the Node SDK's generated alphalib robot and template types to match the latest sync,
  including new robot schemas and metadata refinements. Release the MCP server alongside it so the
  validated server and SDK surfaces stay aligned.

## 4.7.6

### Patch Changes

- 16a36f6: Add intent-first CLI commands for common tasks such as image generation, background removal,
  Markdown conversion, and image description.

  Improve the CLI with generated intent docs, result URL printing, and more robust file/input
  handling for intent and assembly workflows.

## 4.7.5

### Patch Changes

- 377bf31: Raise default listRobots limit from 20 to 200 so agents see all robots in one call

## 4.7.4

### Patch Changes

- 753f76d: Add `--scope` support to `transloadit auth token` and expose `mintBearerToken()` to request narrower bearer token scopes.

## 4.7.3

### Patch Changes

- d7ae6ad: feat(cli): add `transloadit auth token` to mint bearer tokens for hosted MCP (with HTTPS/redirect safety guards)

## 4.7.2

### Patch Changes

- 744f531: Expand npm metadata (keywords/homepage/bugs) for better discoverability.

## 4.7.1

### Patch Changes

- ee1edb7: Fix PaginationStream to end on empty pages, preventing hangs in assembly listing.

## 4.7.0

### Minor Changes

- 65095fa: feat(cli): add `templates list --include-builtin` and `--include-content`

## 4.6.0

### Minor Changes

- d045c39: Add token-efficient robot documentation helpers:

  - `transloadit docs robots list|get` CLI commands for offline robot discovery and full docs.
  - `getRobotHelp()` supports `detailLevel: "full"` and exports `isKnownRobot()`.
  - MCP tool `transloadit_get_robot_help` returns full docs and supports requesting multiple robots.

## 4.5.1

### Patch Changes

- 2631623: Allow overriding the Transloadit-Client header and set MCP server requests to its own client name.

## 4.5.0

### Minor Changes

- a5548db: Fetch builtin templates from the API and remove bundled builtin template data.

## 4.4.0

### Minor Changes

- 6e3a3f4: Add upload CLI flags for create/resume tus endpoints and support expected uploads for out-of-band tus flows.

## 4.3.1

### Patch Changes

- 065df19: Add sev-logger based logging with redaction for MCP server, and improve input handling with trusted assembly URLs and configurable URL download restrictions.

## 4.3.0

### Minor Changes

- 9f6dfa7: Add local Assembly Instructions linting with CLI support, template merging, and optional auto-fixes.

### Patch Changes

- @transloadit/utils@4.3.0

## 4.2.0

### Minor Changes

- f1e21d8: Add `resumeAssemblyUploads` for resuming tus uploads from Assembly status and improve upload
  mapping/resume behavior.

### Patch Changes

- @transloadit/utils@4.2.0

## 4.1.9

### Patch Changes

- 35fdb58: Avoid publishing workspace protocol dependency versions to npm.
  - @transloadit/utils@4.1.9

## 4.1.8

### Patch Changes

- @transloadit/utils@4.1.8

## 4.1.7

### Patch Changes

- d443386: Add shared signature helpers in @transloadit/utils and reuse them in the Node SDK.
- Updated dependencies [d443386]
  - @transloadit/utils@4.1.7

## 4.1.6

## 4.1.5

### Patch Changes

- 0318b97: Add assembly status helpers and expand busy status codes for consistent terminal checks.

## 4.1.4

### Patch Changes

- Sync alphalib schema updates (ai-chat robot, new file-filter operators, updated assembly status codes).

## 4.1.3

### Patch Changes

- Publish initial patch releases for the split packages and legacy wrapper.

## 4.1.3

### Patch Changes

- f989dc1: chore: align workspace packages for upcoming monorepo releases
