You’re right to call that out — there isn’t any “background” process running here. I can’t actually keep working after I reply. So instead of telling you it’s “in progress”, I’m going to give you the full implementation-ready design doc **now**, plus the launch/marketing plan and the directory submission list with concrete URLs/targets.

---

# Transloadit MCP Server

Design doc for a TypeScript MCP server module inside the Transloadit `node-sdk` monorepo, shipping both **hosted** (`api2.transloadit.com/mcp`) and **self-hosted** (CLI + embeddable handler) modes.

## 0. One-sentence product decision

**The single most sensible MCP offering for Transloadit is a “Transloadit MCP Server” that turns Transloadit into an agent-native “pipeline runtime”:** it lets agents (a) validate/lint AssemblyInstructions, (b) run curated common pipelines (“golden templates”), (c) run fully custom pipelines, and (d) manage uploads + polling via Assembly status URLs — without ever blocking on long jobs.

That’s it. Everything else (catalogs, schema on-demand, uploads) serves that core.

---

## 1. Why this is the right MCP product

### What MCP users want (pattern from the ecosystem)

Across MCP directories, the servers that get adopted tend to be:

- **One clearly-bounded “capability surface”** (not “the whole API”), with safe defaults.
- **Async-first**: tool calls return quickly, then provide a polling handle.
- **Discoverable**: “what tools exist?” + “how do I use them?” without dumping huge schemas into context.
- **Works both locally and remotely** (local = easiest dev UX; remote = easiest “SaaS UX”).

Transloadit is naturally aligned with this because Assemblies are already async and URL-addressable (Assembly status URL is the handle). Transloadit already supports huge files (docs indicate up to ~200GB). ([Transloadit][1])

---

## 2. Scope, goals, and non-goals

### Goals

1. **Primary**: Let agents create and run Transloadit workflows (Assemblies) reliably.
2. **Async-by-default**: never block waiting for completion; always return an Assembly URL quickly.
3. **Two-tier surface**:

   - **Golden templates** (≈10 tools): fast wins, high discoverability.
   - **Custom AssemblyInstructions**: full power for advanced agents/users.

4. **Schema help without schema bloat**:

   - Server-side linting/validation.
   - On-demand robot documentation/parameter help (small responses, targeted).

5. **Works hosted + self-hosted**:

   - Hosted at `api2.transloadit.com/mcp`.
   - Self-hosted binary/CLI and embeddable Express/Node handler.

6. **Safe-by-default**:

   - Proper auth (bearer tokens over HTTP).
   - Origin/host validation for Streamable HTTP (DNS rebinding protections). ([Model Context Protocol][2])

### Non-goals (MVP this week)

- Full MCP OAuth authorization-server implementation (can be phased).
- Streaming partial results from Transloadit (we can add later).
- Trying to push multi-megabyte binary file payloads through MCP JSON tool args (we’ll provide better flows).

---

## 3. Repo placement and packaging

### Yes — it should live inside the `node-sdk` monorepo

Reasons:

- You already have the primitives (AssemblyInstructions typing, linting, robot parameter autocomplete).
- MCP server becomes “just another interface” over the same core.

### Monorepo structure proposal

Add a new package:

```
/packages
  /node-sdk            (existing)
  /assembly-lint       (existing or new shared internal)
  /mcp-server          (NEW)  <-- version 0.0.1
  /mcp-server-cli      (NEW optional, can be inside mcp-server)
```

### Versioning

You said the monorepo currently versions packages in lockstep, but MCP server must ship as `0.0.1`.

**Recommended approach**: switch to independent package versioning (Changesets or Lerna independent).

- Keep existing packages as-is (still often bump together).
- Allow `@transloadit/mcp-server` to start at `0.0.1`.

This is the one monorepo change I’d accept as “worth it”, because you’ll want to iterate MCP independently.

---

## 4. Protocol + transport choices

### Transport support

Implement:

1. **Streamable HTTP** at `/mcp` (primary, recommended by spec). ([Model Context Protocol][2])

   - Single endpoint supports POST + GET. ([Model Context Protocol][2])
   - Must validate Origin / protect from DNS rebinding. ([Model Context Protocol][2])

2. **Legacy SSE** endpoints (`/sse` + `/messages`) for older clients (some still use it; spec notes Streamable HTTP replaced HTTP+SSE). ([Model Context Protocol][2])
3. **stdio** transport for local (Claude Desktop / Cursor local execution).

### MCP SDK dependency

Use the official TS SDK v1.x for production stability right now; the repo explicitly notes v2 is pre-alpha and v1 remains recommended until v2 stabilizes. ([GitHub][3])

Implementation-wise, Codex can follow the SDK patterns shown in MCP docs/examples for:

- `McpServer`
- `StreamableHTTPServerTransport`
- `SSEServerTransport`
- `StdioServerTransport`

---

## 5. Authentication model

You said: “MCP might not support our auth; easiest is key+secret.”

Here’s the reality:

- The MCP HTTP authorization spec expects **Bearer tokens in `Authorization` header**, not secrets in query strings. ([Model Context Protocol][4])
- Remote servers are expected to support OAuth-style flows for web clients; the docs describe the 401 + `WWW-Authenticate` + protected resource metadata discovery pattern. ([Model Context Protocol][5])

### Best MVP plan (this week)

Implement **two auth modes**, one for hosted and one for self-hosted:

#### A) Hosted (`api2.transloadit.com/mcp`) — “Transloadit MCP Token”

- Users generate a **dedicated MCP access token** in Transloadit (or via API2 endpoint).
- MCP client connects with:
  `Authorization: Bearer <mcp_token>`
- Server validates token, maps to Transloadit account internally.
- Token is scoped and revocable.

This matches MCP expectations (Bearer), avoids “clients that can’t send two headers”, and doesn’t require OAuth on day 1.

#### B) Self-hosted (local/CLI) — key+secret via env/config

- For local stdio servers (Claude Desktop etc.), environment variables are normal.
- Example env:

  - `TRANSLOADIT_KEY`
  - `TRANSLOADIT_SECRET`

This is consistent with your existing SDK usage and keeps “secret handling” local.

### Phase 2 (after MVP): OAuth for Claude Custom Connectors

If you want **Claude Web “Add custom connector”** to feel native, you will eventually want the OAuth flow described in MCP docs. ([Model Context Protocol][5])
But it’s totally reasonable to ship MVP with bearer tokens first.

---

## 6. Long-running jobs: never block tool calls

**Do not poll inside a single tool call** as your default — tool calls can time out, and you’ll waste agent cycles.

Instead:

- All “run” tools return immediately with:

  - `assembly_id`
  - `assembly_url`
  - `status_url` (same as assembly_url, or a derived endpoint)
  - plus “next steps” text.

Transloadit’s API already returns an `assembly_url` handle. ([Transloadit][1])

### Provide one “wait” tool (optional)

Add:

- `transloadit_wait_for_assembly` with `timeout_ms` (default 0 or 1000–2000).
- Internally it polls until:

  - completed, or
  - timeout reached (return partial status).

This gives agents a convenient “best effort” sync path without making all runs synchronous.

---

## 7. File handling (including large files)

You said: “2 large files is what people use TL for” and “ideally yes” for direct upload.

### Key principle

**Don’t try to send large binaries through MCP tool arguments.** MCP messages are JSON; base64 in JSON is a last resort.

### Support these inputs

Define a unified `InputFile` type:

```ts
type InputFile =
  | { kind: "url"; url: string; filename?: string; contentType?: string }
  | { kind: "base64"; base64: string; filename: string; contentType?: string }
  | { kind: "path"; path: string } // self-hosted only
  | { kind: "tus"; tusUploadUrl: string; filename?: string }; // advanced
```

### Upload strategies by mode

#### Hosted MCP server

Supported:

- **URL ingestion**: best for big files (pre-signed URLs, etc.)
- **tus direct-to-Transloadit**: multi-step, but scales
- **base64**: small files only (set limit, e.g. 10–25MB)

To make tus workflow agent-friendly, add a tool:

**`transloadit_prepare_upload`**
Input: `{ expectedFiles: [{filename, size, contentType?}], assemblyPlan: ... }`
Output:

- `assembly_url`
- tus endpoint(s) / instructions
- `upload_instructions` (copy-pastable curl / tus client snippet)
- `next_tool`: “call transloadit_get_assembly_status after upload”

This reduces “back and forth” to:

1. prepare
2. upload externally
3. poll via MCP

#### Self-hosted local server

Allow:

- `path` input: local server reads the file and uploads using SDK/tus.
  This is where “agent has a local file” becomes seamless.

**Security**: in local mode, require allowlisted roots (like the official filesystem MCP server pattern).

---

## 8. Tool surface design

You asked whether to expose high-level features or let models construct custom instructions.

**Recommendation**: do both, but keep it elegant:

### Tool categories

1. **Golden templates (10 tools)** — simple, high-signal, discoverable
2. **Custom pipeline tools** — full power
3. **Discovery & linting tools** — make custom pipelines feasible without dumping 60–200KB schemas

### Naming convention

Prefix everything with `transloadit_` so tools are grouped.

---

## 9. Exact tool specs (Codex-ready)

### 9.1 Core tools

#### Tool: `transloadit_validate_assembly`

Purpose: lint/validate AssemblyInstructions **without** creating an Assembly or uploading.

Input schema:

- `instructions: object` (freeform JSON, but validated server-side)
- `strict?: boolean` (default true)
- `return_fixed?: boolean` (default false; optional autofix formatting)

Output:

- `ok: boolean`
- `errors: Array<{ path: string; message: string; severity: "error"|"warning"; hint?: string }>`
- `warnings: Array<...>`
- `normalized_instructions?: object` (if `return_fixed`)

Implementation:

- Use your existing linting primitives and schema checks.
- Ensure output is small and actionable.

#### Tool: `transloadit_run_custom_assembly`

Purpose: create an Assembly from custom instructions; upload if files provided.

Input:

- `instructions: object`
- `files?: InputFile[]`
- `wait_for_completion?: boolean` (default false)
- `wait_timeout_ms?: number` (default 0 or 1500)
- `tags?: string[]` (optional)

Output:

- `assembly_id: string`
- `assembly_url: string`
- `ok: boolean`
- `status: "executing"|"completed"|"canceled"|"error"`
- `results?: object` (only if completed)
- `next_steps: string`

Notes:

- If files include `path`, only allow in self-hosted mode.
- If large base64 detected, return an error advising URL/tus flow.

#### Tool: `transloadit_get_assembly_status`

Purpose: polling.

Input:

- `assembly_url?: string`
- `assembly_id?: string`

Output:

- `assembly_id`
- `assembly_url`
- `status`
- `bytes_received?`
- `ok: boolean`
- `errors?`
- `warnings?`
- `results?` (when complete)

#### Tool: `transloadit_wait_for_assembly` (optional convenience)

Input:

- `assembly_url | assembly_id`
- `timeout_ms` (default 5000)
- `poll_interval_ms` (default 500)

Output: same as status tool, plus `waited_ms`.

---

### 9.2 Discovery tools

#### Tool: `transloadit_list_robots`

Purpose: list robots with short descriptions.

Input:

- `category?: string`
- `search?: string`
- `limit?: number` (default 25)

Output:

- `robots: Array<{ name: string; title?: string; summary: string; docs_url?: string }>`
- `next_cursor?: string`

#### Tool: `transloadit_get_robot_help`

Purpose: fetch “just enough” robot parameter guidance without dumping full schema.

Input:

- `robot_name: string`
- `detail_level?: "summary"|"params"|"examples"` (default "params")

Output:

- `robot_name`
- `summary`
- `required_params: Array<{ name: string; type: string; description?: string }>`
- `optional_params: Array<...>`
- `examples: Array<{ description: string; snippet: object }>` (small)

Implementation idea:

- Derive from your internal zod definitions, but summarize.
- Hard cap response size (e.g., 8–12KB).

#### Tool: `transloadit_list_golden_templates`

Output:

- template list with name + what it does + expected inputs.

---

### 9.3 Golden template tools (10)

Each one calls an internal `buildAssemblyForTemplate(templateName, options)` that returns AssemblyInstructions, then routes through `run_custom_assembly`.

Pick 10 that map to the most common “developer mental models”:

1. `transloadit_encode_hls`
2. `transloadit_encode_mp4`
3. `transloadit_extract_audio`
4. `transloadit_generate_video_thumbnails`
5. `transloadit_optimize_image`
6. `transloadit_resize_image`
7. `transloadit_ocr_document`
8. `transloadit_transcribe_audio`
9. `transloadit_text_to_speech`
10. `transloadit_face_detect_or_redact`

(Transloadit docs show robots for video adaptive/encode/thumbnails, audio encode, document OCR, and AI features like text-to-speech/transcription in their robot catalog/pricing pages.) ([Transloadit][6])

Each tool should:

- take a minimal config,
- accept `files?: InputFile[]`,
- return assembly_url quickly,
- provide “next steps”.

---

## 10. Server implementation architecture

### 10.1 Package public API

In `packages/mcp-server/src/index.ts` export:

- `createTransloaditMcpServer(options)` → returns configured `McpServer` instance + helpers
- `createTransloaditMcpHttpHandler(options)` → Node http handler for `/mcp`
- `createTransloaditMcpExpressRouter(options)` → Express router mounting `/mcp`, `/sse`, `/messages`
- `startTransloaditMcpStandalone(options)` → starts an HTTP server (for CLI)

### 10.2 Server options

```ts
type TransloaditMcpOptions = {
  mode: "hosted" | "self-hosted";
  auth:
    | { type: "bearer"; validate: (token: string) => Promise<AuthContext> }
    | { type: "key-secret"; key?: string; secret?: string }; // self-hosted
  allowFilePaths?: { enabled: boolean; roots: string[] }; // self-hosted only
  limits?: {
    maxBase64Bytes: number;
    maxConcurrentAssembliesPerSession: number;
  };
  transloadit?: {
    apiBaseUrl?: string; // default api2.transloadit.com
  };
  docs?: {
    maxRobotHelpBytes: number;
  };
  logging?: {
    logger: { info(); warn(); error(); debug() };
  };
};
```

### 10.3 Request context

Every tool execution gets a context containing:

- `authContext` (account id, key, etc.)
- `requestId`
- `mode`
- `clientInfo` from MCP initialize

---

## 11. HTTP transport security requirements (must implement)

Streamable HTTP spec includes a security warning:

- validate `Origin`
- bind to localhost when local
- implement auth ([Model Context Protocol][2])

Additionally, TS SDK has had DNS rebinding protection concerns; ensure you enable protections (and/or implement your own allowlist). ([advisories.gitlab.com][7])

### Hosted server recommended policy

- Require HTTPS
- Require Authorization
- Validate Origin against known MCP clients if possible, but realistically:

  - allow `Origin: https://claude.ai`, `https://chatgpt.com`, etc.
  - allow missing Origin for server-to-server.

- Rate limit by token.

### URL ingestion SSRF protection

If you support `{kind:"url"}` and your server fetches URLs:

- Allow only `http/https`
- Block private networks (`127.0.0.1`, RFC1918, link-local)
- Optionally require signed URLs (recommended)

---

## 12. How tools map to Transloadit API (concrete)

### Assembly creation

Use Transloadit “create assembly” endpoint via the Node SDK (or directly) and return `assembly_url`. The API response includes `assembly_url`. ([Transloadit][1])

### Uploading

Use tus flow:

- Create Assembly
- Upload to tus endpoint associated with that Assembly
- Then assembly runs

(You mentioned you already provide tus endpoints after creating an assembly — this matches the standard Transloadit approach.)

### Polling

Use `assembly_url` to check status (your server can do the HTTP GET and return normalized status to agent).

---

## 13. Standalone CLI UX

Ship an executable via `bin` in the package:

`transloadit-mcp`

Commands:

- `transloadit-mcp stdio`
  Uses stdio transport (for Claude Desktop etc.)
- `transloadit-mcp http --port 8787 --host 127.0.0.1`
  Starts Streamable HTTP server on localhost

Config:

- env vars for key/secret
- optional JSON config file path
- `--allow-root /Users/me/Videos`

---

## 14. Hosted deployment plan (`api2.transloadit.com/mcp`)

Mount:

- `POST/GET /mcp` (Streamable HTTP)
- `GET /sse` and `POST /messages` (legacy)
- `GET /.well-known/...` later if you add OAuth (phase 2)

Auth:

- `Authorization: Bearer <mcp_token>`

Token minting (API2):

- `POST /mcp/tokens` with existing key+secret auth (server-side)
- returns bearer token with scopes like `mcp:tools`

(Full OAuth per MCP docs can come next; remote authorization docs describe the pattern. ([Model Context Protocol][5]))

---

## 15. Testing strategy

### Unit tests

- `validate_assembly` returns correct structured errors
- golden templates produce valid instructions
- robot help summarization stays within size caps

### Integration tests (optional but valuable)

- Spin up local MCP server with stdio; run MCP inspector tests.
- Mock Transloadit API responses.

### Security tests

- Origin validation enforcement
- URL SSRF blocking
- base64 size enforcement

---

## 16. MVP deliverables checklist (what Codex should implement)

1. New package `@transloadit/mcp-server` version `0.0.1`
2. Streamable HTTP `/mcp` handler
3. Legacy `/sse` + `/messages` handler
4. stdio entrypoint
5. Tools:

   - validate_assembly
   - run_custom_assembly
   - get_assembly_status
   - wait_for_assembly (optional)
   - list_robots
   - get_robot_help
   - list_golden_templates
   - 10 golden template tools

6. Upload handling:

   - accept URL/base64/path (path only local)
   - `prepare_upload` tool returning tus instructions

7. Docs:

   - README with examples for Claude Desktop + Cursor + generic HTTP client

8. Minimal auth:

   - hosted: bearer
   - self-hosted: env key/secret

---

# Pitfalls to avoid

1. **Blocking tool calls** waiting for Transloadit jobs → timeouts, brittle. Return Assembly URL instead.
2. **Shipping huge schemas** as tool definitions → context bloat, slower agents.
3. **Accepting arbitrary URLs without SSRF protections** → serious security hole.
4. **Weak HTTP transport protections** (Origin/DNS rebinding) → known risk in MCP Streamable HTTP transport guidance. ([Model Context Protocol][2])
5. **Requiring two headers for auth** for hosted → some clients only support a single API key field; bearer token avoids that.

---

# Marketing and distribution plan (do-this-week)

You said “dev-to-dev, official hosted, self-hosting as aside”. That’s perfect.

## 1) Canonical listing: Official MCP Registry

The ecosystem is converging on the **Official MCP Registry** as a canonical source. ([registry.modelcontextprotocol.io][8])
Also: registry server names are namespace-verified (reverse-DNS style). ([Model Context Protocol][9])

Action:

- Publish a `server.json` manifest for:

  - hosted remote server: `com.transloadit/mcp-server` (or similar)
  - local server package: `io.github.transloadit/transloadit-mcp` (if you want GitHub namespace)

- Follow the registry publishing flow (the registry docs and automation guides exist). ([Model Context Protocol][10])

## 2) Major third-party MCP directories to submit to

Submit to all of these (they’re active and have clear submission flows):

### A) Glama

Glama is massive (shows **17k+ servers** and actively updated). ([Glama – MCP Hosting Platform][11])
Action:

- Create a Glama account and submit the server listing (or whatever their “Add server” flow is in UI).
- Mark it **Official** and **Remote**.

### B) mcpservers.org

They have a direct submission form (free, optional paid fast lane). ([Awesome MCP Servers][12])

### C) MCP.so

They collect a huge number of servers and explicitly describe submission via GitHub issue from their Submit button. ([MCP.so][13])

### D) MCP Market

Directory/marketplace oriented; list there for discovery. ([MCP Market][14])

### E) Smithery

Smithery positions itself as a large MCP marketplace. ([smithery.ai][15])
Even if you don’t rely on their hosting, being listed matters.

### F) Other “long tail” directories (fast submissions)

- MCPTop submit page ([MCPTop][16])
- MCP Server Hub submit ([Halloween Game][17])
- MCPServersList submit ([MCPServersList][18])
- mcpservers.com (directory; submit flow varies) ([MCP Servers][19])
- mcpserverhub / mcp.so / etc already above

## 3) GitHub “list of lists” (high leverage)

- The official `modelcontextprotocol/servers` repo notes the **official registry** is the right place for listings, but the README also links many ecosystem resources. ([GitHub][20])
  You should still:

  - Publish to the Official Registry first
  - Then open a PR to any “awesome MCP servers” lists that accept community additions (several are referenced in that README).

## 4) What to write (docs + blog) that actually drives adoption

### Minimum docs set

1. **“Install in 2 minutes”** (hosted)

   - “Add remote MCP server URL: `https://api2.transloadit.com/mcp`”
   - “Paste MCP token”

2. **“Local mode”** (self-hosted)

   - install `npm i -g @transloadit/mcp-server` (or whatever)
   - add Claude Desktop config with env vars
   - enable `allowFilePaths` for `/Users/me/Videos`

3. **“Large files”** page

   - best practice: tus upload flow and `prepare_upload` tool

4. **“10 golden templates”** page with examples
5. **“Custom pipeline”** page: how to iterate with `validate_assembly`

### Founder blog post outline (one post, not fluff)

Title:
**“Announcing Transloadit MCP Server: agent-native video, image, and document pipelines”**

Sections:

- What MCP is (1 paragraph)
- Why Transloadit fits MCP (Assemblies = async workflows; status URLs)
- Demo:

  - “Encode HLS” golden template
  - “OCR PDF + translate + text-to-speech” (if you want an “AI chain” example)

- Advanced:

  - validate custom AssemblyInstructions
  - run custom pipelines

- Uploads:

  - URL ingest and tus for large files

- Security:

  - bearer tokens, revocable

- Links:

  - docs + repo

## 5) Launch channels (dev-to-dev)

- X/Twitter (short demo video + link)
- LinkedIn (same, but framed as developer workflow)
- Hacker News (“Show HN: Transloadit MCP Server…”)
- Reddit `r/mcp` (there’s an active MCP subreddit discussing auth, listings, etc.)
- Your newsletter (you already said you will)
- Communities:

  - Cursor community
  - Claude / Anthropic community spaces
  - Any “agent builders” Discords you’re already in

---

# The only remaining “big decision” I’d flag (but you can ship MVP without it)

**Do you want to support Claude Web Custom Connectors “native auth” immediately?**
If yes, you’ll need to implement the OAuth-style flow described in MCP authorization docs (401 + protected resource metadata, etc.). ([Model Context Protocol][5])
If no, a bearer token is plenty for MVP and for most developer agent setups.

---

If you want, in the next message I can convert this into an even more “Codex-optimized” format: a file-by-file implementation plan (`packages/mcp-server/src/*.ts`), including the exact tool registration code skeletons and the zod schemas for each tool input/output.

[1]: https://transloadit.com/docs/api/assemblies-post/ "Create a new Assembly | Transloadit"
[2]: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports "Transports - Model Context Protocol"
[3]: https://github.com/modelcontextprotocol/typescript-sdk "GitHub - modelcontextprotocol/typescript-sdk: The official TypeScript SDK for Model Context Protocol servers and clients"
[4]: https://modelcontextprotocol.io/specification/draft/basic/authorization "Authorization - Model Context Protocol"
[5]: https://modelcontextprotocol.io/docs/tutorials/security/authorization "Understanding Authorization in MCP - Model Context Protocol"
[6]: https://transloadit.com/docs/robots/text-speak/?utm_source=chatgpt.com "text/speak Synthesize speech in documents"
[7]: https://advisories.gitlab.com/pkg/npm/%40modelcontextprotocol/sdk/CVE-2025-66414/?utm_source=chatgpt.com "Model Context Protocol (MCP) TypeScript SDK does not ..."
[8]: https://registry.modelcontextprotocol.io/ "https://registry.modelcontextprotocol.io/"
[9]: https://modelcontextprotocol.io/registry/about "https://modelcontextprotocol.io/registry/about"
[10]: https://modelcontextprotocol.io/registry/github-actions "https://modelcontextprotocol.io/registry/github-actions"
[11]: https://glama.ai/mcp/servers?utm_source=chatgpt.com "Popular MCP Servers"
[12]: https://mcpservers.org/submit?utm_source=chatgpt.com "Submit Your MCP Server"
[13]: https://mcp.so/ "MCP Servers"
[14]: https://mcpmarket.com/?utm_source=chatgpt.com "MCP Market: Discover Top MCP Servers"
[15]: https://smithery.ai/ "https://smithery.ai/"
[16]: https://mcptop.art/submit "Submit your MCP Server and Get Traffic | MCPTop"
[17]: https://mcpserverhub.com/en/submit "MCP Server Hub | Discover The Best MCP Servers & Tools"
[18]: https://mcpserverslist.com/submit "Submit Your MCP Server - MCPServersList | MCPServersList"
[19]: https://mcpservers.com/?utm_source=chatgpt.com "MCP Servers - Model Context Protocol | The #1 MCP Server List"
[20]: https://github.com/modelcontextprotocol/servers "https://github.com/modelcontextprotocol/servers"
