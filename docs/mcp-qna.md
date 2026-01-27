Here are the clarifications I’d want before turning this into a concrete todo list (marketing/launch items skipped).

## High‑Priority Decisions

> Versioning policy: Are we actually switching the monorepo to independent versioning, or do we want a different way to ship > @transloadit/mcp- server@0.0.1 without changing the overall versioning strategy?

foo

> Package split: Do we want a single package that includes both server and CLI, or separate @transloadit/mcp- server and > @transloadit/mcp-server-cli packages as implied?

foo

> MVP scope: Is “MVP this week” still the timeline, and which items are truly must‑have vs nice‑to‑have (e.g., legacy SSE, wait tool)?

foo

> Hosted auth source of truth: Do we already have a real “MCP token” issuance/validation endpoint, or does this spec require > new API2 work that isn’t defined yet?

foo

> Self‑hosted HTTP auth: Should local HTTP mode require auth at all, or is it allowed to run without auth on localhost?

foo

> SDK version pin: Which exact version of the MCP TS SDK should we lock to (v1.x minor/patch), and do we need a compatibility strategy for v2?

foo

## Tool Contracts & Error Semantics

> Input schema format: Do we want JSON Schema (MCP tool schema) or zod‑to‑schema generated at runtime, and where will those live?

foo

> Standard error shape: Should tools return { ok:false, errors:[...] } or throw MCP errors? Right now outputs mix ok, status, > and errors without a consistent contract.

foo

> “results” size: If results can be large, do we cap, truncate, or replace with a results_url/summary to avoid huge responses?

foo

> run_custom_assembly wait behavior: wait_for_completion + wait_timeout_ms is defined, but should it call wait_for_assembly > internally and include waited_ms? Need a single pattern.

foo

> get_assembly_status inputs: If both assembly_id and assembly_url are provided, which wins? If neither, do we return a typed error?

foo

> next_steps content: Is it fixed canned text, or should it be structured data (e.g., next_tool + params) for agents?

foo

## Uploads & File Handling

> InputFile needs a field name: How do we map multiple files to Transloadit form fields (e.g., file, file_2)? The type has no field/name.

foo

> URL ingestion path: Are we fetching URLs server‑side (needs SSRF protection) or passing URL ingestion to Transloadit > directly (different security posture)?

foo

> Base64 limits: What are concrete limits and error messages (hosted and self‑hosted)? The spec gives “10–25MB” but no final number.

foo

> prepare_upload input: assemblyPlan is undefined — should it be instructions, template, or a named “golden template” reference?

foo

> Local path allowlist: How should allowlisted roots be defined and validated (glob support? case‑sensitivity? Windows > paths?) and what’s the error if outside roots?

foo

## Robots, Templates, and Data Sources

> Robot catalog source: Where do list_robots and get_robot_help pull from (existing zod defs, docs scraper, or a new curated list)?

foo

> Robot naming and mapping: Confirm exact robot IDs and parameters for the 10 “golden templates” (some names in the doc are high‑level).

foo

> Account feature gating: How should tools behave when an account doesn’t have access to a robot (e.g., AI features)?

foo

> list_golden_templates payload: Do we include example snippets or just metadata? Is the list static, or versioned/configurable?

foo

> Help size limits: What happens when maxRobotHelpBytes is exceeded (truncate, error, or reduce detail level)?

foo

## Transport & Server Architecture

> Express dependency: Are we ok adding Express as a runtime dependency for createTransloaditMcpExpressRouter, or should we avoid framework deps?

foo

> SSE support: Do we truly need legacy / sse + /messages, and do we have a client list driving that requirement?

foo

> Origin validation policy: What exact allowlist behavior do we want (hardcoded list, config‑driven, allow missing Origin)?

foo

> DNS rebinding protection: Are we relying on the SDK’s implementation or implementing our own host allowlist?

foo

> Host/port defaults: For CLI http mode, do we force 127.0.0.1 unless --host is set?

foo

## Testing & Quality

> Test harness: Do we have existing test utilities for MCP in this repo, or do we need to bring in MCP inspector tooling?

foo

> Mocking Transloadit: Should integration tests hit real API2 in a staging account or use mocks?

foo

> Security tests: What are the concrete scenarios we must cover (Origin missing, private IP URL, oversized base64)?

foo

> Knip/format expectations: Any known exclusions or fixtures that need to be updated when adding a new package?

foo
