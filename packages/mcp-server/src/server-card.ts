import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'
import packageJson from '../package.json' with { type: 'json' }

export const serverCardPath = '/.well-known/mcp/server-card.json'

type JsonSchemaObject = Record<string, unknown>

type ServerCardToolDefinition = {
  name: string
  title: string
  description: string
  inputSchema: JsonSchemaObject
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
  authentication?: { required: boolean; schemes: string[] }
  capabilities: { tools: { listChanged: boolean } }
  tools: ['dynamic'] | ServerCardToolDefinition[]
}

const tools: ServerCardToolDefinition[] = [
  {
    name: 'transloadit_lint_assembly_instructions',
    title: 'Lint Assembly Instructions',
    description:
      'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
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
    title: 'Create or resume an Assembly',
    description:
      'Create or resume an Assembly, optionally uploading files and waiting for completion.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        instructions: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },
        files: {
          type: 'array',
          items: { type: 'object' },
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
    title: 'Get Assembly Status',
    description: 'Fetch the latest Assembly status by URL or ID.',
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
    title: 'Wait For Assembly Completion',
    description: 'Polls until the Assembly completes or timeout is reached.',
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
    title: 'List Robots',
    description: 'Returns a filtered list of robots with short summaries.',
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
    title: 'Get Robot Help',
    description: 'Returns a robot summary and parameter details.',
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
    title: 'List Templates',
    description:
      'List Assembly Templates (owned and/or builtin). Tip: pass include_builtin: "exclusively-latest" to list builtins only.',
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
]

export const buildServerCard = (
  endpoint: string,
  options: { authKey?: string; authSecret?: string } = {},
): ServerCard => {
  const hasCredentials = Boolean(options.authKey && options.authSecret)

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
    documentationUrl: 'https://transloadit.com/docs/topics/ai-agents/',
    iconUrl: 'https://transloadit.com/favicon.ico',
    transport: {
      type: 'streamable-http',
      endpoint,
    },
    authentication: {
      required: !hasCredentials,
      schemes: ['bearer'],
    },
    capabilities: {
      tools: { listChanged: false },
    },
    tools,
  }
}
