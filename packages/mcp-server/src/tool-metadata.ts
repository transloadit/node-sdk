import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import { builtinShortcuts, describeBuiltinShortcut } from './builtin-shortcuts.ts'
import { assemblyResultWidgetUri } from './ui/assembly-result-widget.ts'

/** Auth Key scopes the hosted tools need; mirrors API2's `safeMcpScopes` allowlist. */
export const mcpScopes = {
  assembliesRead: 'assemblies:read',
  assembliesWrite: 'assemblies:write',
  templatesRead: 'templates:read',
} as const

/** Per-tool security scheme as read by ChatGPT and Claude (MCP draft `securitySchemes`). */
export type ToolSecurityScheme = { type: 'noauth' } | { type: 'oauth2'; scopes: string[] }

export const toolNames = [
  'transloadit_lint_assembly_instructions',
  'transloadit_create_assembly',
  'transloadit_get_assembly_status',
  'transloadit_wait_for_assembly',
  'transloadit_list_robots',
  'transloadit_get_robot_help',
  'transloadit_list_templates',
  'transloadit_get_profile',
] as const

export type ToolName = (typeof toolNames)[number] | (typeof builtinShortcuts)[number]['name']

export type ToolMetadata = {
  title: string
  description: string
  annotations: ToolAnnotations
  /** `public` tools need no Transloadit account; `account` tools call API2 for the caller. */
  access: 'public' | 'account'
  /** Every Auth Key scope any code path of the tool may need. */
  scopes: string[]
  /** Host-specific `_meta` keys (OpenAI, MCP Apps). `securitySchemes` is mirrored in automatically. */
  meta?: Record<string, unknown>
}

/**
 * How callers authenticate with this deployment, which decides what each tool may honestly
 * declare:
 * - `hosted`: every unauthenticated request gets the OAuth challenge (Claude Code and Codex only
 *   start OAuth on a 401), so even the public tools need an OAuth token.
 * - `server-credentials`: the server signs with its own Auth Key, so no tool needs caller auth.
 * - `caller-credentials`: public tools work anonymously; account tools need a forwarded token.
 */
export type ToolAuthMode = 'hosted' | 'server-credentials' | 'caller-credentials'

export const resolveToolAuthMode = (options: {
  resourceMetadataUrl?: string
  authKey?: string
  authSecret?: string
}): ToolAuthMode => {
  if (options.resourceMetadataUrl) return 'hosted'
  if (options.authKey && options.authSecret) return 'server-credentials'
  return 'caller-credentials'
}

/** The `securitySchemes` a tool declares in the given deployment mode. */
export const resolveSecuritySchemes = (
  metadata: ToolMetadata,
  mode: ToolAuthMode,
): ToolSecurityScheme[] => {
  if (mode === 'server-credentials') return [{ type: 'noauth' }]
  if (mode === 'caller-credentials' && metadata.access === 'public') return [{ type: 'noauth' }]
  return [{ type: 'oauth2', scopes: metadata.scopes }]
}

const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}

const widgetMeta = {
  ui: { resourceUri: assemblyResultWidgetUri },
  'openai/outputTemplate': assemblyResultWidgetUri,
}

/** Names of the hosted tools whose results render in the Assembly result widget. */
export const widgetToolNames: readonly ToolName[] = [
  'transloadit_create_assembly',
  'transloadit_wait_for_assembly',
  ...builtinShortcuts.map(({ name }) => name),
]

/**
 * Titles, descriptions, annotations, access and scopes for every tool, shared by the live
 * server and the static server card so the two never drift.
 */
const genericToolMetadata: Record<(typeof toolNames)[number], ToolMetadata> = {
  transloadit_lint_assembly_instructions: {
    title: 'Lint Assembly Instructions',
    description:
      'Lint complete, merged Assembly Instructions without creating an Assembly. Resolve template_id and merge any Template or replay overrides before calling; this tool does not fetch Templates. Returns structured issues.',
    annotations: readOnly,
    access: 'public',
    scopes: [],
  },
  transloadit_create_assembly: {
    title: 'Create or resume an Assembly',
    description:
      'Create an Assembly from instructions (Steps or a template_id), or resume one by assembly_url, optionally uploading files and waiting for completion. Files attached in the chat arrive under attachments; public URLs and small base64 payloads go under files. If a file exists only locally or in your sandbox, set expected_uploads and run each returned upload_instructions curl command there (it needs outbound HTTPS to Transloadit). Waiting stops after a server budget (45 seconds by default). Returns the Assembly with its result files; running: true means it is still processing, and next_steps say how to follow it instead of creating it again.',
    annotations: {
      readOnlyHint: false,
      // Export Robots (/s3/store, /google/store, …) can overwrite files at the destination, so
      // hosts should confirm before running caller-supplied instructions.
      destructiveHint: true,
      idempotentHint: false,
      // URL inputs and /http/import Steps fetch caller-supplied locations.
      openWorldHint: true,
    },
    access: 'account',
    // Reading `template_id` instructions needs templates:read; status polling is public in API2.
    scopes: [mcpScopes.assembliesWrite, mcpScopes.templatesRead],
    meta: {
      ...widgetMeta,
      'openai/fileParams': ['attachments'],
      'openai/toolInvocation/invoking': 'Processing files with Transloadit…',
      'openai/toolInvocation/invoked': 'Transloadit processed the files',
    },
  },
  transloadit_get_assembly_status: {
    title: 'Get Assembly status',
    description:
      'Fetch the current status and result files of an Assembly by assembly_url or assembly_id, without waiting.',
    annotations: readOnly,
    access: 'account',
    scopes: [mcpScopes.assembliesRead],
    meta: {
      // The result widget calls this through the host to follow a running Assembly. MCP Apps
      // tools are visible to the model and apps by default; ChatGPT needs the explicit opt-in.
      ui: { visibility: ['model', 'app'] },
      'openai/widgetAccessible': true,
      'openai/toolInvocation/invoking': 'Checking the Assembly status…',
      'openai/toolInvocation/invoked': 'Fetched the Assembly status',
    },
  },
  transloadit_wait_for_assembly: {
    title: 'Wait for Assembly completion',
    description:
      'Polls until the Assembly completes, timeout_ms passes or the server budget (45 seconds by default) is spent. A result with running: true is still processing; call this again to keep following it.',
    annotations: readOnly,
    access: 'account',
    scopes: [mcpScopes.assembliesRead],
    meta: {
      ...widgetMeta,
      'openai/toolInvocation/invoking': 'Waiting for the Assembly to finish…',
      'openai/toolInvocation/invoked': 'The Assembly finished',
    },
  },
  transloadit_list_robots: {
    title: 'List Transloadit Robots',
    description:
      'List Transloadit Robots, the processing units used in Assembly Steps, with short summaries. Filter by category or search text; page with cursor.',
    annotations: readOnly,
    access: 'public',
    scopes: [],
  },
  transloadit_get_robot_help: {
    title: 'Get Robot parameter help',
    description:
      'Returns the summary, required and optional parameters and examples for one Robot (robot_name) or several (robot_names), for writing Assembly Steps.',
    annotations: readOnly,
    access: 'public',
    scopes: [],
  },
  transloadit_list_templates: {
    title: 'List Templates',
    description:
      'List Assembly Templates (owned and/or builtin). Tip: pass include_builtin: "exclusively-latest" to list builtins only.',
    annotations: readOnly,
    access: 'account',
    scopes: [mcpScopes.templatesRead],
    meta: {
      'openai/toolInvocation/invoking': 'Listing Templates…',
      'openai/toolInvocation/invoked': 'Listed Templates',
    },
  },
  transloadit_get_profile: {
    title: 'Get connected Workspace',
    description:
      'Returns a stable identifier and name for the Transloadit Workspace behind the current credentials, so hosts can tell connected accounts apart.',
    annotations: readOnly,
    access: 'account',
    // The Workspace is read from the latest Assembly, falling back to an owned Template.
    scopes: [mcpScopes.assembliesRead, mcpScopes.templatesRead],
    meta: {
      'openai/profile': true,
    },
  },
}

/** Builtins share the Assembly tool's upload/auth/widget metadata and cannot override its Steps. */
export const toolMetadata: Record<ToolName, ToolMetadata> = {
  ...genericToolMetadata,
  ...Object.fromEntries(
    builtinShortcuts.map(({ id, name, title }) => [
      name,
      {
        ...genericToolMetadata.transloadit_create_assembly,
        title,
        description: describeBuiltinShortcut(id),
        annotations: {
          ...genericToolMetadata.transloadit_create_assembly.annotations,
          destructiveHint: false,
        },
      },
    ]),
  ),
}

/**
 * Cross-tool workflow guidance, sent once as the MCP initialize `instructions`. Tool descriptions
 * stay self-contained (Claude's directory requires that they never instruct about other tools),
 * so how the tools fit together lives here and in result next_steps.
 */
export const serverInstructions = [
  'Transloadit processes media and documents in Assemblies: encoding video, manipulating images, converting documents, transcribing speech and more.',
  `For a common outcome, prefer a Builtin shortcut tool when tools/list includes one (${builtinShortcuts.map(({ name }) => name).join(', ')}; the connected Workspace may not offer all of them). transloadit_list_templates with include_builtin: "exclusively-latest" lists every Builtin Template.`,
  'For a custom workflow, find Robots with transloadit_list_robots, read their parameters with transloadit_get_robot_help, check the Steps with transloadit_lint_assembly_instructions, then run them with transloadit_create_assembly.',
  'Files shared in the chat go under attachments; public URLs and small base64 payloads go under files. For files that exist only locally or in a sandbox, set expected_uploads, run each returned upload_instructions curl command where the file lives, then call transloadit_wait_for_assembly.',
  'When a result has running: true, the Assembly is still processing: follow it with transloadit_wait_for_assembly or transloadit_get_assembly_status instead of creating it again, and follow any next_steps in the result.',
  'transloadit_get_profile identifies the connected Transloadit Workspace.',
].join('\n\n')

/** `_meta` for `tools/list`: carries `securitySchemes` for hosts that only read `_meta`. */
export const buildToolMeta = (
  metadata: ToolMetadata,
  securitySchemes: ToolSecurityScheme[],
): Record<string, unknown> => ({
  securitySchemes,
  ...metadata.meta,
})
