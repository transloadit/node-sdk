Here are the clarifications I’d want before turning this into a concrete todo list (marketing/launch items skipped).

## High‑Priority Decisions

> Versioning policy: Are we actually switching the monorepo to independent versioning, or do we want a different way to ship > @transloadit/mcp- server@0.0.1 without changing the overall versioning strategy?

I'd like to separate mcp-server, and keep the rest versioned in lockstep if possible.

> Package split: Do we want a single package that includes both server and CLI, or separate @transloadit/mcp- server and > @transloadit/mcp-server-cli packages as implied?

It should be one package, that also offers a cli, just like @transloadit/node does these days.

> MVP scope: Is “MVP this week” still the timeline, and which items are truly must‑have vs nice‑to‑have (e.g., legacy SSE, wait tool)?

We can add an extra week or two to do it right

> Hosted auth source of truth: Do we already have a real “MCP token” issuance/validation endpoint, or does this spec require > new API2 work that isn’t defined yet?

It will require api2 work also in ~/code/api2. If we want to support Claude Web, it likely also requires CRM/webapi work.

> Self‑hosted HTTP auth: Should local HTTP mode require auth at all, or is it allowed to run without auth on localhost?

On localhost it's allowed to run without auth

> SDK version pin: Which exact version of the MCP TS SDK should we lock to (v1.x minor/patch), and do we need a compatibility strategy for v2?

Let's only support latest majors at the time of writing to keep things focussed. People can write wrappers if they must.

## Tool Contracts & Error Semantics

> Input schema format: Do we want JSON Schema (MCP tool schema) or zod‑to‑schema generated at runtime, and where will those live?

zod-to-schema. mcp-server specific zod schemas can live in @transloadit/mcp-server. Hopefully we can re-use a lot of the specifics however from @transloadit/zod/v3 (all in ~/code/node-sdk)

> Standard error shape: Should tools return { ok:false, errors:[...] } or throw MCP errors? Right now outputs mix ok, status, > and errors without a consistent contract.

Come up with a single consistent elgant contract that all adheres to. what about status: 'ok' | 'error', errors: [...]?

> “results” size: If results can be large, do we cap, truncate, or replace with a results_url/summary to avoid huge responses?

We'll clean up Assembly Result json to via helpers in @transloadit/zod/v3 and @transloadit/utils. But otherwise we do not truncate. Agents these days will do their own summarization in order ot not drown in context. Let's rely on them making the right calls. The good things about that is that they can also come back to the original payload and pick another thing if they determine they summarized wrongly in hindsight.

> run_custom_assembly wait behavior: wait_for_completion + wait_timeout_ms is defined, but should it call wait_for_assembly > internally and include waited_ms? Need a single pattern.

by default it should not wait, and offer the assembly_url so that the agent can decide to wait or poll or check some time later. waiting/blocking is opt in.

> get_assembly_status inputs: If both assembly_id and assembly_url are provided, which wins? If neither, do we return a typed error?

make assembly_url leading

> next_steps content: Is it fixed canned text, or should it be structured data (e.g., next_tool + params) for agents?

Take the wisest most elegant approach

## Uploads & File Handling

> InputFile needs a field name: How do we map multiple files to Transloadit form fields (e.g., file, file_2)? The type has no field/name.

One-index suffext, `file_1` .... `file_199`

> URL ingestion path: Are we fetching URLs server‑side (needs SSRF protection) or passing URL ingestion to Transloadit > directly (different security posture)?

We'll let Transloadit fetch the URL with the /http/import Robot.

> Base64 limits: What are concrete limits and error messages (hosted and self‑hosted)? The spec gives “10–25MB” but no final number.

10MB for now, the error should encourage

- letting Transloadit get the file with one of its import Robots, instead.
- creating an assembly, provisioning tus upload slots, and uploading to those endpoints.

> prepare_upload input: assemblyPlan is undefined — should it be instructions, template, or a named “golden template” reference?

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
