# MCP file and Assembly access

## Review items

- [x] Read PR #512, its discussion, CONTRIBUTING.md, and the release workflow.
- [x] Merge current main into the PR branch; no conflicts or existing review threads.
- [x] Reject untrusted Assembly URLs before any API operation, and resolve valid
  references through the configured API endpoint without forwarding caller URLs.
- [x] Validate Assembly IDs to prevent path or query injection.
- [x] Resume public URL uploads without requiring the original instructions.
- [x] Disable API redirects for MCP, including `redirect_url` responses, while
  preserving the SDK's default redirect behavior.
- [x] Cover rejected private downloads and retained base64, URL, and custom-endpoint
  workflows with regression tests that fail before the fix.
- [x] Update migration documentation and the MCP/SDK package changeset.
- [ ] Run council-review and address its findings.
- [x] Pass `corepack yarn check` and `corepack yarn verify:full`, including generated
  legacy-wrapper synchronization, package tests, dependency checks, and type tests.

## Release tracking

After council review, use green PR CI to merge #512 and complete the Changesets
release through Version Packages #509. Verify npm versions/tags and GitHub notes
against that PR's final release list. Its existing automated updates fail because
repository rules prohibit force-pushes; update the version branch using normal
commits without changing repository protections.

The user explicitly authorized fixing and releasing PR #512. No GitHub review
comments were open at the start. The Assembly URL issue and URL-resume issue were
reproduced during the preceding review. SDK callers retain their existing API;
the stricter trust boundary belongs to MCP. The SDK adds an opt-out for API
redirects without changing its default behavior.

Red-first evidence: `/tmp/mcp-file-access-red.log` (20 new failures) and
`/tmp/mcp-api-redirect-red.log` (4 redirect regressions). Package build and unit
checks pass after the fixes. The earlier local DNS typing failure disappeared
after installing the current lockfile's dependencies.
