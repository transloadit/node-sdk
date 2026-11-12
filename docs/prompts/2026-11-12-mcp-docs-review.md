# MCP documentation tools — PR #472 review follow-up

- [x] Address kvz’s September 23 review: use `transloadit_list_docs` and `transloadit_get_doc_help`, matching the existing Robot discovery/help names. Keep the existing Robot tools unchanged; use their optional `search` input convention.
- [x] Explain the overlap: Robot tools return structured Step parameter references; documentation tools cover API authentication/endpoints, SDK setup, FAQs, integration concepts and full Robot prose. Update descriptions, README and the release changeset.
- [x] Rebase onto current main (`80251a8`), resolving the tool registry and README conflicts without reverting authentication metadata or Builtin discovery behavior.
- [x] Preserve the earlier scoped-index and bounded-stream review fixes. Retire the rollout fallback now that scoped indexes are deployed: missing/oversized indexes return errors instead of silently incomplete results.
- [x] Validate today’s live indexes and fix observed duplicate URLs, missing overview links and poor multi-term ranking. Add deterministic regression coverage and MCP client-level naming, anonymous access, listing, help and sanitized-error tests.

Live checks on November 12, 2026 at 14:08 UTC passed for API/authentication, FAQ/assembly expiry, SDK/Node.js, Robot/resize and all/authentication. Each expected page ranked first and was fetched as bounded Markdown. The FAQ page was returned whole (455 characters); longer pages were truncated at 1,500 characters. Unfiltered discovery returned 20 distinct pages; `/docs/` resolved to the `/docs.md` overview.

The MCP workspace typecheck, all 363 MCP unit tests, root `yarn check`, and both stdio integration tests pass. A real in-memory MCP client also listed and fetched the live authentication guide without account credentials. CI is recorded in the PR’s validation section.

Independent review limitation: `council-review` is not installed. A read-only Claude CLI review was attempted, but its OAuth session is expired and could not be refreshed. No independent review is claimed.
