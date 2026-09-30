import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import type { ToolName, ToolSecurityScheme } from './tool-metadata.ts'

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'

import packageJson from '../package.json' with { type: 'json' }
import { toolMetadata } from './tool-metadata.ts'

export const serverCardPath = '/.well-known/mcp/server-card.json'

type JsonSchemaObject = Record<string, unknown>

type ServerCardToolInput = {
  name: ToolName
  inputSchema: JsonSchemaObject
}

type ServerCardToolDefinition = ServerCardToolInput & {
  title: string
  description: string
  annotations: ToolAnnotations
  securitySchemes: ToolSecurityScheme[]
}

type ServerCardAuthentication = {
  required: boolean
  schemes: string[]
  /** RFC 9728 protected-resource metadata that names the OAuth authorization server. */
  resourceMetadataUrl?: string
}

type ServerCard = {
  $schema: string
  version: string
  protocolVersion: string
  serverInfo: { name: string; title: string; version: string }
  description: string
  documentationUrl: string
  iconUrl: string
  transport: { type: string; endpoint: string }
  authentication?: ServerCardAuthentication
  capabilities: { tools: { listChanged: boolean }; resources: { listChanged: boolean } }
  tools: ['dynamic'] | ServerCardToolDefinition[]
}

const toolInputs: ServerCardToolInput[] = [
  {
    name: 'transloadit_lint_assembly_instructions',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['instructions'],
      properties: {
        instructions: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },
        strict: { type: 'boolean', description: 'Treat warnings as errors.' },
        return_fixed: { type: 'boolean', description: 'Return normalized instructions when true.' },
      },
    },
  },
  {
    name: 'transloadit_create_assembly',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        instructions: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },
        files: {
          type: 'array',
          items: { type: 'object' },
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['download_url', 'file_id'],
            properties: {
              download_url: { type: 'string' },
              file_id: { type: 'string' },
              mime_type: { type: 'string' },
              file_name: { type: 'string' },
            },
          },
        },
        fields: { type: 'object' },
        wait_for_completion: { type: 'boolean' },
        wait_timeout_ms: { type: 'number' },
        upload_concurrency: { type: 'number' },
        upload_chunk_size: { type: 'number' },
        upload_behavior: { type: 'string', enum: ['await', 'background', 'none'] },
        expected_uploads: { type: 'number' },
        assembly_url: { type: 'string' },
      },
    },
  },
  {
    name: 'transloadit_get_assembly_status',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        assembly_url: { type: 'string' },
        assembly_id: { type: 'string' },
      },
    },
  },
  {
    name: 'transloadit_wait_for_assembly',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        assembly_url: { type: 'string' },
        assembly_id: { type: 'string' },
        timeout_ms: { type: 'number' },
        poll_interval_ms: { type: 'number' },
      },
    },
  },
  {
    name: 'transloadit_list_robots',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: 'string' },
        search: { type: 'string' },
        limit: { type: 'number' },
        cursor: { type: 'string' },
      },
    },
  },
  {
    name: 'transloadit_get_robot_help',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        robot_name: { type: 'string' },
        robot_names: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'transloadit_list_templates',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        page: { type: 'number' },
        page_size: { type: 'number' },
        sort: { type: 'string', enum: ['id', 'name', 'created', 'modified'] },
        order: { type: 'string', enum: ['asc', 'desc'] },
        keywords: { type: 'array', items: { type: 'string' } },
        include_builtin: {
          type: 'string',
          enum: ['all', 'latest', 'exclusively-all', 'exclusively-latest'],
        },
        include_content: { type: 'boolean' },
      },
    },
  },
  {
    name: 'transloadit_get_profile',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
]

const tools: ServerCardToolDefinition[] = toolInputs.map((tool) => {
  const metadata = toolMetadata[tool.name]
  return {
    ...tool,
    title: metadata.title,
    description: metadata.description,
    annotations: metadata.annotations,
    securitySchemes: metadata.securitySchemes,
  }
})

export const buildServerCard = (
  endpoint: string,
  options: { authKey?: string; authSecret?: string; resourceMetadataUrl?: string } = {},
): ServerCard => {
  const hasCredentials = Boolean(options.authKey && options.authSecret)
  // Hosted deployments hand out tokens through OAuth; self-hosted ones accept a static bearer.
  const schemes = options.resourceMetadataUrl ? ['oauth2', 'bearer'] : ['bearer']

  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
    version: '1.0',
    protocolVersion: LATEST_PROTOCOL_VERSION,
    serverInfo: {
      name: 'transloadit-mcp',
      title: 'Transloadit MCP Server',
      version: packageJson.version,
    },
    description:
      'Agent-native media processing: video encoding, image manipulation, document conversion, and more via 86+ Robots.',
    documentationUrl: 'https://transloadit.com/docs/sdks/mcp-server/',
    iconUrl: 'https://transloadit.com/favicon.ico',
    transport: {
      type: 'streamable-http',
      endpoint,
    },
    authentication: {
      required: !hasCredentials,
      schemes,
      ...(options.resourceMetadataUrl ? { resourceMetadataUrl: options.resourceMetadataUrl } : {}),
    },
    capabilities: {
      tools: { listChanged: false },
      resources: { listChanged: false },
    },
    tools,
  }
}
