import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'

import packageJson from '../package.json' with { type: 'json' }

export const serverCardPath = '/.well-known/mcp/server-card.json'

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
  tools: ['dynamic']
}

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
    // Credential-scoped catalog schemas are authoritative only through authenticated tools/list.
    tools: ['dynamic'],
  }
}
