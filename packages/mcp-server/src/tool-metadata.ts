import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

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

export type ToolName = (typeof toolNames)[number]

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
]

/**
 * Titles, descriptions, annotations, access and scopes for every tool, shared by the live
 * server and the static server card so the two never drift.
 */
export const toolMetadata: Record<ToolName, ToolMetadata> = {
  transloadit_lint_assembly_instructions: {
    title: 'Lint Assembly Instructions',
    description:
      'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
    annotations: readOnly,
    access: 'public',
    scopes: [],
  },
  transloadit_create_assembly: {
    title: 'Create or resume an Assembly',
    description:
      'Create or resume an Assembly, optionally uploading files and waiting for completion. Files attached in the chat arrive under attachments; public URLs and small base64 payloads go under files.',
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
    description: 'Fetch the latest Assembly status by URL or ID.',
    annotations: readOnly,
    access: 'account',
    scopes: [mcpScopes.assembliesRead],
    meta: {
      'openai/toolInvocation/invoking': 'Checking the Assembly status…',
      'openai/toolInvocation/invoked': 'Fetched the Assembly status',
    },
  },
  transloadit_wait_for_assembly: {
    title: 'Wait for Assembly completion',
    description: 'Polls until the Assembly completes or timeout is reached.',
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
    description: 'Returns a filtered list of Robots with short summaries.',
    annotations: readOnly,
    access: 'public',
    scopes: [],
  },
  transloadit_get_robot_help: {
    title: 'Get Robot parameter help',
    description: 'Returns a Robot summary and parameter details.',
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

/** `_meta` for `tools/list`: carries `securitySchemes` for hosts that only read `_meta`. */
export const buildToolMeta = (
  metadata: ToolMetadata,
  securitySchemes: ToolSecurityScheme[],
): Record<string, unknown> => ({
  securitySchemes,
  ...metadata.meta,
})
