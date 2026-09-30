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
  securitySchemes: ToolSecurityScheme[]
  /** Host-specific `_meta` keys (OpenAI, MCP Apps). `securitySchemes` is mirrored in automatically. */
  meta?: Record<string, unknown>
}

const noAuth: ToolSecurityScheme = { type: 'noauth' }

const oauth2 = (...scopes: string[]): ToolSecurityScheme => ({ type: 'oauth2', scopes })

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
 * Titles, descriptions, annotations and security schemes for every tool, shared by the live
 * server and the static server card so the two never drift.
 */
export const toolMetadata: Record<ToolName, ToolMetadata> = {
  transloadit_lint_assembly_instructions: {
    title: 'Lint Assembly Instructions',
    description:
      'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
    annotations: readOnly,
    securitySchemes: [noAuth],
  },
  transloadit_create_assembly: {
    title: 'Create or resume an Assembly',
    description:
      'Create or resume an Assembly, optionally uploading files and waiting for completion. Files attached in the chat arrive under attachments; public URLs and small base64 payloads go under files.',
    annotations: {
      readOnlyHint: false,
      // Creating an Assembly is billable but never deletes or overwrites customer data.
      destructiveHint: false,
      idempotentHint: false,
      // URL inputs and /http/import Steps fetch caller-supplied locations.
      openWorldHint: true,
    },
    securitySchemes: [oauth2(mcpScopes.assembliesWrite)],
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
    securitySchemes: [oauth2(mcpScopes.assembliesRead)],
    meta: {
      'openai/toolInvocation/invoking': 'Checking the Assembly status…',
      'openai/toolInvocation/invoked': 'Fetched the Assembly status',
    },
  },
  transloadit_wait_for_assembly: {
    title: 'Wait for Assembly completion',
    description: 'Polls until the Assembly completes or timeout is reached.',
    annotations: readOnly,
    securitySchemes: [oauth2(mcpScopes.assembliesRead)],
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
    securitySchemes: [noAuth],
  },
  transloadit_get_robot_help: {
    title: 'Get Robot parameter help',
    description: 'Returns a Robot summary and parameter details.',
    annotations: readOnly,
    securitySchemes: [noAuth],
  },
  transloadit_list_templates: {
    title: 'List Templates',
    description:
      'List Assembly Templates (owned and/or builtin). Tip: pass include_builtin: "exclusively-latest" to list builtins only.',
    annotations: readOnly,
    securitySchemes: [oauth2(mcpScopes.templatesRead)],
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
    securitySchemes: [oauth2()],
    meta: {
      'openai/profile': true,
    },
  },
}

/** `_meta` for `tools/list`: mirrors `securitySchemes` for hosts that only read `_meta`. */
export const buildToolMeta = (metadata: ToolMetadata): Record<string, unknown> => ({
  securitySchemes: metadata.securitySchemes,
  ...metadata.meta,
})
