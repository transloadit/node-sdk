High‑Priority Decisions

Versioning policy: Are we actually switching the monorepo to independent versioning, or do we want a different way to ship @transloadit/mcp-server@0.0.1 without changing the overall versioning strategy?

We prefer to treat the new MCP server package with its own versioning, while keeping the rest of the monorepo packages versioned in lockstep as before. In practice, that means we can publish @transloadit/mcp-server starting at version 0.0.1 independently, without bumping the version of every other package in the monorepo. The other packages will continue to follow the unified versioning scheme, but mcp-server will be an exception that uses independent versioning (using our existing Changesets workflow to manage this).

Package split: Do we want a single package that includes both server and CLI, or separate @transloadit/mcp-server and @transloadit/mcp-server-cli packages as implied?

We will have one package that provides both the server library and the CLI. In other words, @transloadit/mcp-server will also offer a CLI interface (similar to how @transloadit/node includes its CLI tool). There’s no need to maintain two separate packages for this; the CLI can simply be an executable entry point included in the single mcp-server package.

MVP scope: Is “MVP this week” still the timeline, and which items are truly must‑have vs nice‑to‑have (e.g., legacy SSE, wait tool)?

We can afford to extend the timeline by an extra week or two to get the MVP done right. This means we don’t have to rush everything into this week; we can include more of the important features (like robust error handling or the wait/polling mechanism) rather than deferring them. Non-essential or legacy features (for example, legacy SSE support or other older interfaces) can be treated as lower priority or even omitted if they complicate the initial release. The focus is on delivering a solid, modern MVP even if it takes a bit more time.

Hosted auth source of truth: Do we already have a real “MCP token” issuance/validation endpoint, or does this spec require new API2 work that isn’t defined yet?

There isn’t an existing MCP-specific auth endpoint yet, so we will need to implement new support in API2. In other words, API2 (Transloadit’s main API) will have to gain the ability to issue and validate MCP tokens as described. This spec implies some new work in ~/code/api2 to create an endpoint (or extend an existing one) for generating and verifying these tokens. Additionally, if we want to support services like Claude Web (an AI client) with MCP, we might also need to coordinate with our CRM or web API layer to integrate the token issuance and verification there. Essentially, hosted authentication will require back-end changes that we should plan for alongside the MCP server development.

Self‑hosted HTTP auth: Should local HTTP mode require auth at all, or is it allowed to run without auth on localhost?

When running the MCP server on localhost for local use, it will be allowed to run without authentication. In other words, if you start the MCP server in HTTP mode bound to 127.0.0.1, we won’t require presenting an auth token. This makes local development and testing easier. However, if the server is configured to listen on a public interface (anything other than localhost), then authentication should be required. This strikes a balance between ease of use locally and security in deployed scenarios.

SDK version pin: Which exact version of the MCP TypeScript SDK should we lock to (v1.x minor/patch), and do we need a compatibility strategy for v2?

We’ll target only the latest major version of the MCP TypeScript SDK at the time of this release. In practice, that means if the current SDK is v1.x, we’ll use that (and include minor/patch updates as needed), and we won’t attempt to support an older major or anticipate a future v2 in the initial release. The goal is to keep things focused on a single supported SDK version. If and when a v2 of the SDK comes out, we can update the MCP server to support it then. For now, backward compatibility with older SDK majors isn’t a priority; developers needing that could create their own wrappers or stay on older versions. By locking to the current major version, we reduce complexity.

Tool Contracts & Error Semantics

Input schema format: Do we want to use JSON Schema (MCP tool schema) or generate schemas via zod-to-schema at runtime, and where will those live?

We will use Zod schemas as the single source of truth for input validation, and generate JSON Schema from those as needed via zod-to-schema. Concretely, the MCP server will define its tool input/output schemas using Zod (many of which we can reuse or derive from @transloadit/zod/v3 to stay consistent with Transloadit’s API definitions). These Zod schemas can live alongside the code in @transloadit/mcp-server (for any MCP-server-specific structures) and will be transformed to JSON Schema only if we need to expose a schema (for example, if an agent requests the tool’s input schema). This approach avoids maintaining separate JSON schema definitions manually and ensures that any change to a tool’s input/output shape is made in one place (the Zod schema).

Standard error shape: Should tools return { ok: false, errors: [...] } or throw MCP errors? Right now outputs mix ok, status, and errors without a consistent contract.

We should define one consistent error/response contract for all tools. The idea is to make it simple and uniform. A good approach would be to have every tool respond with a structure containing a status indicator and, in case of errors, a list of error messages (or codes). For example, we could standardize on:

On success: { status: "ok", ...resultFields } (including whatever fields are relevant for the successful result).

On error: { status: "error", errors: [ ...errorObjectsOrMessages ] }.

This way, an agent can always check the status field to see if the call succeeded or failed. We would avoid mixing ok: true/false in some places and status in others – just pick one style. Throwing exceptions internally is fine for flow, but what we return over HTTP (or to the agent) should be this structured object rather than raw exceptions. Making this contract elegant and consistent will help tool consumers (AI agents or developers) handle responses uniformly.

“results” size: If results can be large (e.g., a complex Assembly result JSON), do we cap or truncate it, or replace it with a results_url/summary to avoid huge responses?

We will not truncate or arbitrarily cap the results by default. Instead, we will try to be smart about what we include and exclude in results, and deliver the full necessary data, trusting the client agent to handle it. For example, we can use existing helpers (in @transloadit/zod/v3 and @transloadit/utils) to clean up or slim down the Assembly result JSON – perhaps removing extremely verbose fields or internal-only info – but generally the response will contain the complete result data of an operation. We assume modern AI agents (or other clients) are capable of managing large outputs (by summarizing or analyzing as needed) and can request further details if required. It’s better to give them the full information (within reason) and let them decide how to use it, rather than truncate and possibly omit something important. If context size is a concern, the agent can always summarize or ask for a specific field.

run_custom_assembly wait behavior: The spec has wait_for_completion + wait_timeout_ms. Should this tool internally call wait_for_assembly and include waited_ms, or should it always return immediately? We need a single clear pattern.

By default, the run_custom_assembly tool will not wait for the assembly to complete. It will initiate the assembly and return immediately with the assembly URL (and perhaps initial status). This means the default behavior is non-blocking: the agent gets an immediate response and can decide what to do next (poll for status, wait, etc.). If a user/agent explicitly sets a wait_for_completion flag (and possibly provides a wait_timeout_ms), then we can support a blocking call that internally waits for the assembly to finish (up to the timeout) before returning. In that case, the response would include something like waited_ms (how long we waited) and the final status if it finished in time. But that waiting is opt-in via the parameter. The key is to have a clear and consistent approach: either the agent asks for a synchronous result (with that flag) or handles waiting itself. We’ll implement it such that without the flag, it never waits (just returns the assembly URL and maybe an ID), and with the flag, it behaves like a convenience wrapper around get_assembly_status polling. This way, agents have flexibility but also clarity on what to expect.

get_assembly_status inputs: If both assembly_id and assembly_url are provided, which one is used? If neither is provided, do we return a typed error?

We will make assembly_url the primary field if both are given. In other words, if an agent supplies both an assembly_url and an assembly_id in the request, we will use the assembly_url and ignore the assembly_id (perhaps even returning a warning in the response if that scenario ever happens, to signal that one field was ignored). If neither is provided, we will return a clear error (an error status with a message like "Missing assembly identifier: please provide an assembly_url or assembly_id"). Essentially, one of those two identifiers is required for get_assembly_status to do its job. Preferring assembly_url makes sense because it’s a complete reference that includes region, id, etc., whereas assembly_id alone might need additional context (like region or account info). So, assembly_url wins if present.

next_steps content: Should the next_steps field (in error messages or wherever) be a fixed human-readable string of advice, or should it be structured data (e.g., suggesting a next tool + params) that an agent could act on?

We should design next_steps in the most useful and flexible way for the consuming agent. Ideally, this means making it structured enough that an agent (LLM) could potentially parse it and know what to do next, but also readable so that developers understand it. One elegant approach could be to have next_steps as an array of suggestion objects, where each suggestion has a short description and maybe a reference to a tool and parameters. For example:

"next_steps": [
{
"tool": "get_assembly_status",
"params": { "assembly_url": "..." },
"description": "Once you have an assembly URL, you can check its status using get_assembly_status."
}
]

This way, an AI agent could pick up the tool and params directly to execute, while a human reading the description also understands the guidance. If we decide not to make it fully structured, at the very least the content should be actionable hints (not just generic text). But since this is a protocol for AI agents, leaning toward structured data with a clear meaning is likely the wisest approach. We’ll aim for a format that’s both elegant and practical for next-step guidance.

Uploads & File Handling

InputFile needs a field name: How do we map multiple files to Transloadit form fields (e.g., file, file_2)? The InputFile type has no field/name currently.

If a tool accepts multiple file inputs, we will assign field names by appending a numeric suffix to the base name "file". For example: the first file will be field file_1, the second file_2, and so on (we can continue this pattern up to file_999 if ever needed, though realistically the number of files is usually small). The Transloadit API expects distinct form fields for each file, so using numbered suffixes is a straightforward convention. This means the InputFile representation should include an associated field name internally. If only one file is present, we might use the default field name (often Transloadit just accepts "file" for a single file, but using file_1 consistently is also fine). We’ll document this clearly so that it’s understood how files map to assembly inputs.

URL ingestion path: When a user provides a URL for a file (instead of a local file or base64), are we fetching that URL server‑side (which raises SSRF concerns) or passing the URL to Transloadit to fetch directly?

We will not download external URLs in the MCP server. Instead, if an input file is specified as a URL, we will leverage Transloadit’s capability to import URLs via robots. Specifically, we can use the /http/import robot in the assembly instructions so that Transloadit’s back-end will fetch the file from the URL. This approach is safer and more efficient: it avoids exposing our MCP server to Server-Side Request Forgery (SSRF) risks and leverages Transloadit’s infrastructure (which likely already has proper validations and scaling for URL imports). So effectively, the MCP server will translate a URL input into an assembly step that tells Transloadit to fetch that URL itself.

Base64 limits: What are the concrete size limits for base64-encoded file inputs and the corresponding error messages (for both the hosted service and self-hosted use)? The spec draft mentioned “10–25MB” but did not finalize a number.

We will set a strict size limit of 10 MB for any base64-encoded file content in the request (this applies equally to the hosted service and self-hosted deployments by default). If a user tries to send a file larger than this (after base64 encoding) through the MCP server, the server will reject it with a clear error message. The error message will not only state that the file is too large, but also guide the user toward better approaches for large files. Specifically, it will suggest alternatives like:

Using a URL input (so Transloadit can fetch the file via an import robot, which handles large files more efficiently), or

Using the Tus upload approach where the client first creates an assembly with expected uploads and then uploads the file in chunks to Transloadit.

By enforcing a 10MB limit, we protect the server from memory bloat and encourage usage patterns that are more suited for big files. Ten megabytes seems a reasonable compromise to handle typical small media files or data, while anything larger should use the more scalable upload methods. We’ll document this limit and rationale.

prepare_upload input: The spec references a prepare_upload (or create_assembly) that returns Tus endpoints, but the assemblyPlan is undefined in the doc – should it accept instructions, template_id, or a named golden template reference? How exactly should we handle this step?

On reflection, we likely don’t need a separate prepare_upload tool at all. Instead, we can make the main create_assembly tool smart enough to handle the upload preparation when needed. Here’s how we envision it:

The create_assembly tool will accept an assembly definition (either explicit instructions, a template_id, or a golden_template reference plus any overrides). If the instructions/template indicate that files are expected – for example, they include the :original placeholder or an /upload/handle step – then create_assembly can automatically set up the assembly with the appropriate number of expected uploads. It will respond with the usual assembly info plus the Tus upload URLs (endpoints) for each file slot. This guides the agent to upload the files separately.

In essence, create_assembly would do what a dedicated prepare_upload might have done: create an assembly in pending state, anticipate the file uploads, and hand back the URLs to upload to. The agent (or client) can then upload files to those URLs (for example using Tus protocol or the SDK). We can rely on the logic in @transloadit/node (the Node SDK) to help with this, since it already knows how to create assemblies with expected uploads and might even parse steps to see if uploads are needed. The MCP server will thus be a relatively thin wrapper delegating to the SDK’s capabilities.

By simplifying to one call, we avoid confusion about having to call prepare_upload first. If the user’s assembly instructions have no file inputs (for example, purely using import robots or other generators), then create_assembly can just create and return the assembly normally without any upload URLs. If there are file inputs, it provides the upload URLs.

One additional consideration: if the agent call to create_assembly times out or is disconnected while uploads are still in progress, we need to ensure those uploads can continue. The assembly on Transloadit’s side will remain open waiting for files until it times out, so that’s fine. We might want to implement an assembly_resume tool that an agent could call with an assembly URL/ID to retrieve any still-pending upload URLs or continue a previously started assembly. This isn’t in the initial spec but could be useful. It’s something to consider for robustness (and we might implement it after the basic flow is working). In any case, handling file uploads will largely be about orchestrating Transloadit’s existing tus endpoints and ensuring the agent knows where to send the file data.

Local path allowlist: How should allowed file paths be defined for reading local files (for self-hosted scenarios)? (E.g., a list of allowed root directories, glob patterns, case sensitivity, Windows path support?) And what error if a file is outside allowed roots?

For the initial version, we will not implement a strict local path allowlist in the MCP server itself. Since this feature mainly matters for self-hosted deployments (where the server might access local files), we’ll defer to the deployment or agent owner to run the server in a controlled context. Essentially, we won’t include an explicit “allowed roots” configuration in MVP. If and when users request this kind of security feature, we can add a configurable allowlist of directories (with proper handling of different OS path formats, etc.). But until then, the MCP server will assume that if you’re running it locally and using file paths, you trust it with those paths.

Of course, we will document that by default there’s no path restriction, so if someone exposes their MCP server and hooks up file-reading tools, they should be cautious. In summary, no built-in allowlist or path sandboxing for now – we’ll revisit this later if needed, potentially adding a config for permitted base directories.

Robots, Templates, and Data Sources

Robot catalog source: Where will list_robots and get_robot_help obtain their information? (From existing Zod definitions in the SDK, scraping docs, or a new curated list?)

We will source robot information from the existing schemas and definitions in @transloadit/zod/v3 (which the Transloadit Node SDK uses). This means the MCP server can use the data we already maintain for each Transloadit robot – including its name, allowed parameters, and descriptions – as the basis for listing robots and providing help details. By using the Zod schema definitions, we ensure that the information is up-to-date and exactly matches the actual Transloadit API capabilities. We don’t need to scrape external docs or maintain a separate list manually; it’s better to rely on the single source of truth that already exists in our codebase. Thus, list_robots will likely iterate over the robot schemas we have and return their names and brief info, and get_robot_help can return detailed info (description of what the robot does, the parameters schema, etc.) from those same definitions.

Robot naming and mapping: We have 10 “golden templates” identified (like image resize, video transcoding, etc.). We need to confirm the exact robot IDs and parameters used in each. Some names in the doc were high-level – how will we map those to actual Transloadit steps?

We will cross-reference the golden templates with the official robot definitions in the SDK to pin down their exact steps and parameters. When building this, since we have access to the node SDK (and its @transloadit/zod/v3 schemas), we can identify precisely which robot each template refers to and what the correct parameter names are. For example, if one golden template is described as “audio transcription”, we’ll find the corresponding Transloadit robot (likely the speech/transcribe robot) and use its formal ID and parameter schema. Ensuring this mapping is accurate is crucial so that the golden templates truly work out-of-the-box. In practice, this means each golden template in our list will either be a single robot step or a small combination of steps that we assemble using known robot IDs. We won’t rely on the high-level names alone; we’ll confirm everything against our schema definitions to avoid any ambiguity.

Account feature gating: How should the tools behave if a user’s Transloadit account doesn’t have access to a certain robot or feature (for example, some AI robots that require special permission)?

In cases where the user tries to use a robot (or template) that their Transloadit account is not permitted to use, we will simply propagate the error from the Transloadit API back to the agent. In other words, we are not adding special handling in the MCP server for feature gating – the Transloadit API already knows what an account is allowed to do. If a call fails because of access (e.g., “You need to enable the AI add-on to use this robot”), the MCP server will return that failure as an error response to the agent. This keeps our implementation simple and defers to Transloadit’s own permission system. We should, however, make sure that the error is conveyed in a clear way (perhaps mapping it into our standard error shape). Optionally, in the future we could catch such errors and customize the next_steps to say something like “upgrade your account” or “contact support”, but that’s not necessary for the MVP. So the behavior is: if Transloadit says no, the MCP server says no (passing along the message).

list_golden_templates payload: What will list_golden_templates include for each template – just metadata (name, description, maybe an identifier), or also example instruction snippets? And is this list static, or will it be versioned/configurable over time?

Initially, list_golden_templates will return a static list of curated template descriptors that we define. Each entry will include at least: a unique name (or slug) for the golden template, a short description of what it does, and maybe an identifier or version number. We may also include additional metadata like the actual Transloadit steps it comprises (or a reference to those steps) and possibly an example usage. However, to keep responses concise, we might not dump the full assembly instructions for each template in this listing; instead, the agent can call another tool (or use the template name with create_assembly) to get the actual steps if needed.

In the long run, we anticipate moving the authoritative definition of golden templates to the Transloadit API itself. The idea would be that the API2 knows about these special template names and will substitute the corresponding instructions when an assembly is created. For now though, the MCP server (or the SDK it uses) will have the golden template definitions hardcoded or config-driven. We’ll likely version them (e.g., “video_encoding_v1”) so that improvements can be made without breaking old agents – the list could show the latest version of each. To avoid naming collisions with user-defined templates, we plan to reserve a naming scheme. For example, we might prefix golden template slugs with a special character or namespace (something not allowed in normal user template names) so that the API can distinguish them. We haven’t finalized that yet (we’ll propose a specific prefix or pattern), but it’s on our radar.

So in summary, list_golden_templates returns a fixed curated list (name, description, maybe version), which we maintain. Down the line, these might be loaded from or verified by the API, but initially it’s an internal list. Example output might be an array of entries like:

{
"name": "image_resize",
"version": 1,
"description": "Resize an image to given dimensions (supports JPG, PNG, etc.)"
}

And so forth for the 10 golden templates.

Help size limits: The spec mentioned a maxRobotHelpBytes. What do we do if a robot’s help text is larger than that? Should we truncate, throw an error, or dynamically reduce detail?

We don’t plan to enforce a strict byte size limit for help text. In practice, the help information for a robot (its description and parameter info) should not be excessively large – it might be a few kilobytes at most – so it’s unlikely to be an issue. The mention of maxRobotHelpBytes was probably to be mindful of payload size, but we think it’s unnecessary to implement a hard cutoff. We will try to make the help output concise yet complete (for example, not including overly verbose or repetitive info), but we won’t arbitrarily truncate the help. If, hypothetically, a help response did become very large, we’d rely on the agent to handle that (the agent could always summarize or ask for specific details). Modern LLM agents can manage fairly large inputs, and they can decide if they need to digest the whole thing or not. So, in short: no explicit size limit or truncation on help – just provide the full help content for each robot in a reasonable format.

Transport & Server Architecture

Express dependency: Are we okay adding Express as a runtime dependency for the HTTP server (for example, to implement createTransloaditMcpExpressRouter), or should we avoid tying to a specific framework?

Including Express is fine. We will use Express for our built-in HTTP server implementation, especially since we plan to provide a helper to create an Express router for the MCP endpoints. Express is a well-known, lightweight dependency and it will simplify the HTTP server setup. This does mean @transloadit/mcp-server will have Express as a dependency, but that’s acceptable given the convenience and the fact that many Node developers use Express. We’ll keep the core logic framework-agnostic so that in theory someone could adapt it to another server (by using the underlying functions), but officially supporting Express out of the box makes sense. In summary, yes, we will add an Express router integration – it’s an intentional choice for developer convenience.

SSE support: Do we truly need the legacy Server-Sent Events endpoints (/sse and /messages), and do we have clients that depend on that? Or can we omit SSE in favor of simpler approaches (polling or websockets)?

We have decided not to implement the legacy SSE interface in the new MCP server. Our focus is on a modern API that works with the latest tools and patterns (for example, direct polling via get_assembly_status or potentially a more modern WebSocket if real-time updates are needed in the future). The older /sse and /messages endpoints were part of a legacy system that we don’t want to carry forward unless absolutely necessary. As far as we know, no critical client requirement mandates SSE for the initial release, especially since AI agents can typically handle polling or just call for status when needed. By skipping SSE, we reduce complexity and avoid having to maintain a long-lived connection mechanism. So the MCP server will only support the new, stateless pattern (each request gets an immediate response, no open event stream). If live updates become a desired feature, we might design something fresh (maybe WebSocket based or a callback mechanism), but SSE as it was used historically will not be included.

Origin validation policy: What exact behavior do we want for CORS Origin checking? Will there be a hardcoded allowlist, a config-driven list, and how do we treat missing Origin headers?

We will make the CORS allowed origins configurable, giving the deployer control. For the Transloadit-hosted MCP service, we’ll likely default to a permissive setting (possibly allowing all origins, i.e., \*, to make it easy for web-based agents to call it). For self-hosted instances, we will encourage users to configure an allowlist of origins (or patterns) that suit their needs – for example, their own domain or local dev addresses.

In implementation, we can provide a configuration like ALLOWED_ORIGINS which can be a list of domain strings or wildcard patterns. If that config is left empty or set to a wildcard, we allow any origin. If it’s set, we check incoming Origin headers against it and only send the appropriate CORS headers if there’s a match (or reject the request if we want strict enforcement).

For requests with no Origin header (such as server-to-server calls or curl requests), we’ll treat them as not subject to CORS (since CORS is a browser concept). Typically, if no Origin is present, we can just respond normally (the absence of CORS headers in that case won’t matter to a non-browser client). So missing Origin is effectively treated as “no CORS needed”.

To summarize: config-driven allowlist for origins. Hosted version will likely allow all by default, whereas self-hosted users should tailor it. Missing Origin is not denied (we don’t want to break non-browser usage), we just don’t add CORS headers unless configured to do so.

DNS rebinding protection: Are we relying on the Transloadit SDK’s implementation for guarding against private network addresses (when given URLs), or do we need our own host allowlist for security?

We will rely on the Transloadit Node SDK’s built-in protections for things like DNS rebinding or private IP access, rather than re-implementing those checks in MCP server. The Node SDK (and the Transloadit API itself) has logic to prevent accessing internal IP ranges when importing URLs, to avoid SSRF and similar issues. By delegating URL fetching to Transloadit (via robots like /http/import as mentioned) and by using the SDK, we inherently use those protections. If there are specific concerns not covered by the SDK, we can consider adding extra safeguards, but at this point it seems sufficient. In short, we won’t add a separate host allowlist in the MCP server beyond what Transloadit and the SDK already enforce. This keeps the MCP server simpler and avoids duplicating security logic that could become inconsistent.

Host/port defaults: For the CLI’s HTTP mode (when running a local MCP server), should we default to binding to 127.0.0.1 (localhost) unless the user explicitly sets a host, to avoid exposing it on public interfaces by accident?

Yes, by default the MCP server (when run via CLI or programmatically without explicit host) will bind to 127.0.0.1 (localhost). This ensures that out-of-the-box, a developer running it on their machine isn’t unintentionally opening it up on a public IP. If the user wants it accessible on their local network or externally, they would have to specify a host (e.g., --host=0.0.0.0 on the CLI to listen on all interfaces). Similarly, we’ll choose a default port (likely something like 8080 or 3000; we’ll pick one that’s not commonly in use to minimize conflicts, maybe configurable too). But the key point is safe defaults: bind locally unless told otherwise. This is a common practice for local development servers and avoids surprises.

Testing & Quality

Test harness: Do we have existing test utilities for MCP in this repo, or do we need to build from scratch? For example, any “MCP inspector” tool to simulate an agent for testing?

We currently do not have specialized MCP test utilities in our repository, so we’ll build the testing setup largely from scratch. The plan is to start by writing a comprehensive end-to-end (E2E) test that covers the main flows of the MCP server – from receiving a tool invocation, calling out to Transloadit, and returning the result – to ensure the whole integration works. This E2E test will act like an AI agent making requests (perhaps just using HTTP calls to the local server) and verify the responses and side effects (like assemblies created, etc.).

By starting with an E2E test, we define the desired behavior clearly (almost like a specification), and then we can implement until that test passes. We’ll incorporate this into our CI pipeline. After that, we will also add more unit tests for individual components (like verifying that the instruction parsing or error formatting works in isolation). But the E2E will be our guiding test to catch any integration issues.

We might leverage some existing Transloadit testing utilities (for example, the Node SDK has some mock or fixture capabilities), but since this is a new domain, we’ll likely craft new mocks or use a real API in a controlled way for testing (see next point). In summary: no out-of-the-box MCP test harness exists, so we’ll develop tests using standard tools (Jest, etc.) focusing on end-to-end behavior first.

Mocking Transloadit: Should integration tests hit the real Transloadit API (perhaps using a test account or staging environment), or should we mock API responses?

We’ll adopt a dual approach for testing: unit tests will use mocks for the Transloadit API calls, whereas integration/E2E tests will hit a real Transloadit service (likely using a test account or the staging environment).

For unit tests of our logic, mocking is important so we can simulate various API responses (success, error, edge cases) without making actual HTTP calls, which keeps tests fast and deterministic. We can stub out the SDK functions or the HTTP calls to return predefined data.

However, for a full confidence that everything works together, we do want at least one E2E test that actually creates an assembly on Transloadit (possibly in a sandbox or test mode) and goes through the real network calls. This will alert us to any changes in the API or authentication issues, etc., and ensures our integration is solid. We’ll likely use a Transloadit staging environment or a demo account with limited privileges for these tests, to avoid any production impact or costs. These live tests might be run less frequently or under a controlled setting (since they depend on external service), but they are invaluable for true integration verification.

In short: mock the API for most tests, but have at least one path that hits the real API as a sanity check.

Security tests: What are the concrete scenarios we must cover with tests? (e.g., missing Origin header behavior, private IP URL rejection, oversized base64 input, etc.)

We will definitely write tests for all the mentioned security-related scenarios, among others. Specifically, our test suite will cover:

CORS behavior: Requests with an allowed Origin vs disallowed Origin vs no Origin, ensuring the server responds with the correct CORS headers or rejections according to our config.

SSRF protection: Try using a tool with a URL that points to a private IP (e.g., http://127.0.0.1/... or an internal network IP) and verify that the server (or Transloadit) rejects it. Since we rely on Transloadit’s import for URLs, we might simulate what happens when Transloadit encounters a private IP (the API should return an error which we bubble up).

Base64 limits: Attempt to send a base64 file just under the 10MB limit and just over it, verifying that the first goes through and the second is rejected with the appropriate error message.

Auth required scenarios: If the server is run with auth enabled, test that a request without token is rejected, and with a valid token is accepted. Also test token verification (perhaps a JWT structure or whatever the token format is).

Invalid input: For example, calling create_assembly without required fields, or with conflicting fields (like both template_id and instructions) to see that we return a meaningful error.

Path traversal or invalid file path (if we had allowlist): Even though we aren’t implementing path allowlist now, we might still add a test to ensure that, say, a file path input like /etc/passwd on a hosted service is handled (probably it will just fail because no such file, but just to be mindful of not accidentally exposing anything).

The above are critical to ensure we’re not introducing security regressions. Essentially, we want to simulate any likely abuse or error scenario and ensure the server reacts safely (either by outright rejecting or by sanitizing and handling gracefully).

Knip/format expectations: Our repo uses tools like Knip (dead code elimination checks), Biome/Prettier, etc. Are there known exclusions or configuration updates needed when adding a new package (like for test directories or fixtures)?

We will adhere to all our existing code quality and formatting guidelines. Adding a new package means we should update the monorepo’s config files accordingly:

Knip (dependency checker): We might need to update Knip’s config if it has explicit include/exclude patterns, to ensure it scans the new packages/mcp-server directory and doesn’t flag our code as unused incorrectly. Often, monorepos have a fairly generic config, but we’ll verify.

Biome/Prettier (linting/formatting): We’ll run these tools on the new code to ensure we follow the style (likely our CI will catch any deviations anyway). No special exceptions expected, just follow the standard.

Jest config: If our testing setup requires listing the new package or ignoring certain things (for example, not collecting coverage from test utils), we’ll adjust that.

TypeScript config: Ensure the tsconfig includes the new package, etc., though if we use a composite/solution TSConfig it’s usually straightforward.

Changesets: We are using Changesets for versioning; we’ll make sure to add an entry when we release the new package, and any config that enumerates packages is updated.

At this time, we don’t know of any specific exclusions needed for this package beyond what’s typical (for example, if we add JSON fixture files, we might mark them to be ignored by lints if necessary). We will follow the patterns in the repo (maybe look at how other packages are set up) and remain consistent. The goal is that by the time we open a PR, all these tools pass cleanly, meaning we’ve integrated the new package into the repo’s quality checks properly.

Additional Clarifications:

Monorepo Releases with Changesets: Yes, we are already using Changesets in this repository, so releasing the new mcp-server package will fit into our existing versioning/release process. We’ll create a changeset for it when ready to publish. This answers any concern about how we’ll manage publishing multiple packages — our current workflow supports it.

Golden Template Definitions Location: We plan to add the golden template definitions to the alphalib directory (a shared library directory) which is synchronized between API2 and other repos like the Node SDK. By doing this, all our systems (the MCP server, the API, the SDK) will leverage the same source of truth for those template definitions and schemas. We can even include these golden templates in the initial PR for MCP server (and in the SDK) before the API2 has support, and then later update API2 to use them. Once API2 is ready, it will be able to recognize when a golden template name (and optional version) is used in an assembly creation call and substitute the corresponding steps. To differentiate golden templates from user-defined templates, we’ll likely choose a special naming convention or prefix that isn’t allowed for normal templates, thereby avoiding any collisions. (For example, maybe template names starting with a symbol like $ or a specific namespace could indicate a golden template. We’ll propose a specific scheme for this.) This way, when the API sees a template name with that pattern, it knows to look up our predefined instructions instead of expecting a user’s template.

Handling File Inputs in create_assembly: We believe create_assembly should directly handle file inputs (file paths or raw data) to streamline the workflow. That means the agent can call create_assembly with files and instructions, and our MCP server will manage the rest. Internally, if files are provided, the MCP server (with help from the Node SDK) will create the assembly with expected_uploads and return the upload URLs. It may even start uploading the files immediately in the background (especially for smaller files or if configured to do so). The response to the agent will include the assembly URL regardless, so the agent can choose to wait or poll. If an agent’s call times out while files are uploading, that’s okay – the upload will continue on the server side until complete (since the process was initiated). The assembly will remain in an uploading/pending state on Transloadit until all files arrive or a timeout there.

We are also considering an assembly_resume or similar functionality. This would let an agent reconnect to an assembly that was created earlier (perhaps by ID or a resume token) and retrieve status or reattempt uploads. For example, if an agent started uploading and then crashed or lost connection, it could call assembly_resume to get the remaining upload URLs and continue. This isn’t part of the initial spec, but it’s a useful idea for resilience. The Node SDK doesn’t currently have a direct “resume upload” helper, but Tus (the upload protocol) inherently supports resuming if you have the same upload URL and some way to know how much was sent. We can build a higher-level resume feature into the SDK and utilize it in MCP server later on.

In short, create_assembly will be robust in handling file inputs, simplifying the need for a separate prepare step. We’ll focus on implementing that cleanly (perhaps leveraging the SDK’s existing step parsing to decide if uploads are needed). The user (agent) experience will then be: one call to create the assembly (get back URLs), upload files, then either wait or check status – which is pretty straightforward.
