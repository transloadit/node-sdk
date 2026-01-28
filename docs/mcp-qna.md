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

10MB for now, the error should encourage:

- letting Transloadit get the file with one of its import Robots, instead.
- creating an assembly, provisioning tus upload slots, and uploading to those endpoints.

> prepare_upload input: assemblyPlan is undefined — should it be instructions, template, or a named “golden template” reference?

I don't think there should be a prepare_upload actually. There could be a create_assembly, it does that, depending on the instructions we can infer if `:original` or `/upload/handle` is used, and in that case look at the input, if those are filepaths, or base64 bodies, and create the assembly with that many `expected_uploads`. It should then return the tus endpoints to upload the contents too. Much of this could be handled by the @transloadit/node SDK. Potentially we should first ensure it can do the heavy lifting there, so the @transloadit/mcp-server becomes a thin wrapper.

The sdk also has a stepParsing.ts that will help us determine if we actually do not need uploads at all, but for instance a /http/import step is used and we're passing a URL as an input. Or perhaps a /html/convert step is used to create a screenshot from a webpage url, or perhaps /image/generate or /text/speak is used to generate media from a prompt/text/meta.

> Local path allowlist: How should allowlisted roots be defined and validated (glob support? case‑sensitivity? Windows > paths?) and what’s the error if outside roots?

I think we should delegate this to the agent harness, and not concern ourselves with allowed roots, until this feature request comes in.

## Robots, Templates, and Data Sources

> Robot catalog source: Where do list_robots and get_robot_help pull from (existing zod defs, docs scraper, or a new curated list)?

From zod/v3 defs

> Robot naming and mapping: Confirm exact robot IDs and parameters for the 10 “golden templates” (some names in the doc are high‑level).

You can look them up when building as you'll have access to the node-sdk repo which includes the @transloadit/zod/v3 schemas which is our single source of truth for Robots

> Account feature gating: How should tools behave when an account doesn’t have access to a robot (e.g., AI features)?

The API will error out and the @transloadit/node will bubble this up and the @transloadit/mcp-server will just bubble any error up to the consuming agent.

> list_golden_templates payload: Do we include example snippets or just metadata? Is the list static, or versioned/configurable?

Ultimately i think this should live in the api2. Instead of passing your own template slug or ID, you refer to a golden template and version, and the api2 will use the associated instructions from that. As with regular Templates, the user can still supply their own overrides via the steps property (or skip using (golden) Templates and inline all instructions there).

> Help size limits: What happens when maxRobotHelpBytes is exceeded (truncate, error, or reduce detail level)?

We should probably not implement a maxRobotHelpBytes at all. Just return token efficient help but leave it to modern agents to summarize too large inputs, so that they can also determine they summarized wrongly and redo that.

## Transport & Server Architecture

> Express dependency: Are we ok adding Express as a runtime dependency for createTransloaditMcpExpressRouter, or should we avoid framework deps?

Yes. let's focus on standalone and make express the dependency

> SSE support: Do we truly need legacy / sse + /messages, and do we have a client list driving that requirement?

We will not support legacy systems and build a modern tool that only supports the latest majors of everything to keep things focussed.

> Origin validation policy: What exact allowlist behavior do we want (hardcoded list, config‑driven, allow missing Origin)?

config-driven, for the transloadit-hosted version we'll allow any origin. for self hosted it should be recommended/advertised in getting started sections to pass a (list of) allowed origin strings/regexes.

> DNS rebinding protection: Are we relying on the SDK’s implementation or implementing our own host allowlist?

We'll rely on the SDK

> Host/port defaults: For CLI http mode, do we force 127.0.0.1 unless --host is set?

Yes

## Testing & Quality

> Test harness: Do we have existing test utilities for MCP in this repo, or do we need to bring in MCP inspector tooling?

We have no existing tooling. We'll start with an e2e test with beautiful design and great DX, tie that into our workflow and CI, and then work towards an implementation that supports it.

> Mocking Transloadit: Should integration tests hit real API2 in a staging account or use mocks?

Unit tests should mock the api2, e2e tests should hit the real thing.

> Security tests: What are the concrete scenarios we must cover (Origin missing, private IP URL, oversized base64)?

All of the above

> Knip/format expectations: Any known exclusions or fixtures that need to be updated when adding a new package?

We'll follow the code quality enforcing tools set by the node-sdk monorepo (knip, biome, etc.).
