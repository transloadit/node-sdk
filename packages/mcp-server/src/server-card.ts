import packageJson from '../package.json' with { type: 'json' }

export const serverCardPath = '/.well-known/mcp/server-card.json'

type ServerCardTool = {
  name: string
  description: string
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
  authentication: { required: boolean; schemes: Array<{ type: string; description: string }> }
  capabilities: { tools: boolean }
  tools: ServerCardTool[]
}

const tools: ServerCardTool[] = [
  {
    name: 'transloadit_lint_assembly_instructions',
    description:
      'Lint Assembly Instructions without creating an Assembly. Returns structured issues.',
  },
  {
    name: 'transloadit_create_assembly',
    description:
      'Create or resume an Assembly, optionally uploading files and waiting for completion.',
  },
  {
    name: 'transloadit_get_assembly_status',
    description: 'Fetch the latest Assembly status by URL or ID.',
  },
  {
    name: 'transloadit_wait_for_assembly',
    description: 'Polls until the Assembly completes or timeout is reached.',
  },
  {
    name: 'transloadit_list_robots',
    description: 'Returns a filtered list of robots with short summaries.',
  },
  {
    name: 'transloadit_get_robot_help',
    description: 'Returns a robot summary and parameter details.',
  },
  {
    name: 'transloadit_list_templates',
    description:
      'List Assembly Templates (owned and/or builtin). Tip: pass include_builtin: "exclusively-latest" to list builtins only.',
  },
]

export const buildServerCard = (endpoint: string): ServerCard => ({
  $schema: 'https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json',
  version: '1.0',
  protocolVersion: '2025-03-26',
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
    required: true,
    schemes: [
      {
        type: 'bearer',
        description:
          'Transloadit API Bearer token. Self-hosted: set TRANSLOADIT_KEY and TRANSLOADIT_SECRET env vars (auto-mints tokens). Hosted: call the authenticate tool or pass a bearer token.',
      },
    ],
  },
  capabilities: {
    tools: true,
  },
  tools,
})
