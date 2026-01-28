Yes, this helps a lot — it
resolves most of the big policy
choices. There are still a
handful of design‑level
clarifications needed before a
“crystal clear” design doc and a
churnable todo list. Here’s the
remaining list, grouped by area.

Tool Surface & Contracts

> - Final tool list and names: do we standardize on transloadit_create_assembly vs transloadit_run_custom_assembly , and do we keep transloadit_wait_for_assembly?

Yes, `transloadit_create_assembly` and `transloadit_wait_for_assembly` seem good.

> - Exact response envelope: you decided on { status: "ok" | "error" }, but we still need the precise shape for errors, warnings, and whether assembly tools also expose a separate assembly_status field without colliding with status.

good one. I think for most responses we can be simple and short.
And for Assembly statuses we can add them inside an `assembly` property for instance. Inside that we can show the orgiginal Assembly status with its own code and meta.

> - validate_assembly inputs/ outputs: do strict and return_fixed stay, and what’s the exact output schema (paths, hints, severity)?

We'll base this on the assemblyLinter.ts which already has a schema. Similarly to the envellope earlier, it could be: `status: 'ok'|'error', linting_issues: [{}]`.

> - next_steps schema: you want structured suggestions — define the exact JSON shape and whether it’s always present.

I think it could be just: z.array(z.string()) in human readable form. Example, after creating an assembly:

[
"Use transloadit_wait_for_assembly on https://api2-jane.transloadit.com/assemblies/abcxyz to poll for completion",
"Report back to the user that the video encode is done, with a link to the resulting file"
"The MCP server is still uploading. If the process breaks, or there is a timeout before the files were fully uploaded, you can try transloadit_create_assembly on https://api2-jane.transloadit.com/assemblies/abcxyz" together with the original files and instructions. If possible the tus uploads will be resumed and the Assembly will start executing as soon as all the inputs are satisfied"
]

> - get_assembly_status: define the full set of returned fields (e.g., bytes_received, results, warnings) and the exact mapping from Transloadit’s API response.

We'll just use the assemblyStatus.ts schema again. it's what we said earlier: `status: 'ok'|'error', assembly: $theAssemblyStatusSchemaFrom:@transloadit/zod/v3`. Or since we are to become a thin wrapper around `@transloadit/node`, and it also exports that schema, probably best take it from that, even if zod/v3 is our canonical source of truth.

> - Decide if InputFile keeps tus kind or is removed since prepare_upload is dropped.

Remove i think, handled internally now by create_assembly and resume_assembly <-- after creating an assembly

> - Clarify whether the MCP server ever uploads files on behalf of the agent: - For base64 and path, do we upload server‑side (blocking or background), or always return tus URLs for the agent to upload? - If background uploads are allowed, confirm how we avoid long tool call times and how to report progress.

Even for base64 we defer to tus uploads. If long background uploads break we can use next_steps so the agent knows how to resume the upload. This should be e2e tested.

> - Confirm the exact base64 limit measurement (raw bytes vs base64 string length) and error code/message.

It doesn't matter for the Transloadit side because we'll use regular tus uploads even for base64 uploads. It could be that there are Express/MCP/agent imposed limits. Research this and base your decision on that. Pick a sane default.

> - How InputFile maps to steps: you chose file_1, file_2, etc., but we need to specify how those names are wired into assembly instructions so robots know which input to read.

Okay, we'll pass field names with files, just like the @transloadit/node does it. This means the agent will need to name them.

> - Confirm the final list of 10 templates and the exact robot IDs/step chains for each.

We'll start with 1 golden template:

```
{
  "steps": {
    ":original": {
      "robot": "/upload/handle"
    },
    "low": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-270p",
      "result": true,
      "turbo": true
    },
    "mid": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-360p",
      "result": true,
      "turbo": true
    },
    "high": {
      "robot": "/video/encode",
      "use": ":original",
      "ffmpeg_stack": "v7.0.0",
      "preset": "hls-540p",
      "result": true,
      "turbo": true
    },
    "adaptive": {
      "robot": "/video/adaptive",
      "use": {
        "steps": ["low", "mid", "high"],
        "bundle_steps": true
      },
      "technique": "hls",
      "playlist_name": "my_playlist.m3u8"
    }
  }
}
```

> - Decide the golden template naming/versioning scheme (prefix/namespace), and how API2 will recognize and substitute them.

We'll call this template: `~transloadit/encode-hls-video@0.0.1`

`@` and `~` signs are forbidden in Template slugs/ids, so this will not collide with existing names. The API can be made to recognize these and pull them from the alphalib instead of the customer's row in the database.

> - Define what list_golden_templates returns (fields, versions, whether example snippets are included).

slug
version
description
steps

Auth & Hosted Token Flow

> - Define MCP token format (opaque vs JWT), TTL, scopes, revocation, and the specific API2 endpoints for issue/ verify.

opaque, 6h,

'assemblies:write',
'assemblies:read',
'assembly_notifications:write',
'template_credentials:read',
'queues:read',
'templates:read',

https://api2.transloadit.com/tokens/mcp (to be created)

> - Define how hosted MCP server derives Transloadit auth (key/ secret or a new MCP‑token‑based API path).

You can authenticate with your key & secret with tokens/mcp to get a shortlived mcp bearer token. The agent can use this.

HTTP Security & CORS

> - Confirm if hosted CORS is “allow all” or config‑driven allowlist by default.

Transloadit hosted is allow all. Documentation/examples always show with a config-driven allowlist however.

> - Decide whether disallowed origins are rejected (403) or simply omit CORS headers.

403

> - Even though URL fetching is delegated to Transloadit, decide if the MCP server still validates URL schemes (e.g., reject file:) before constructing import steps.

No, the transloadit api2 is in charge of this

CLI & Runtime Defaults

> - Confirm default port (and env var names), and whether CLI exposes config file flags.

5723, yes

> - Decide whether CLI should expose a --host guard message when binding to non‑localhost.

yes

Testing & CI

> - Specify how the “real API” E2E test is gated (env vars, skipped in CI without creds).

Like you said

> - Decide the minimal test matrix for MVP (unit + 1 E2E, or more).

Many unit tests. 1 full flow, including resuming a broken assembly

Repo/Build Details

> - Node version target and module format (ESM/CJS) for the new package.

ESM only. Node 22 and up.

> - Exact file layout and exports in packages/mcp-server (entry points, bin field).

For the implementer to decide
