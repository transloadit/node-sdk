import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import type { ToolAuthMode, ToolName, ToolSecurityScheme } from './tool-metadata.ts'

import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'

import packageJson from '../package.json' with { type: 'json' }
import { createTransloaditMcpServer, listOwnTools } from './server.ts'
import { resolveSecuritySchemes, resolveToolAuthMode, toolMetadata } from './tool-metadata.ts'

export const serverCardPath = '/.well-known/mcp/server-card.json'

type JsonSchemaObject = Record<string, unknown>

type ServerCardToolDefinition = {
  name: ToolName
  title: string
  description: string
  inputSchema: JsonSchemaObject
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
  tools: ServerCardToolDefinition[]
}

/**
 * Every tool the server registers, with the static input schema `tools/list` serves before a
 * credential-scoped Builtin catalog narrows the shortcut `fields`. Reading a throwaway server's
 * own registry keeps the card from drifting from the live surface; auth options only change the
 * declared security schemes, so the server is built without them.
 */
const buildTools = (mode: ToolAuthMode): ServerCardToolDefinition[] =>
  [...listOwnTools(createTransloaditMcpServer())].map(([name, tool]) => {
    const metadata = toolMetadata[name]
    const inputSchema = normalizeObjectSchema(tool.inputSchema)
    if (!inputSchema) throw new Error(`Tool ${name} has no object input schema.`)
    return {
      name,
      title: metadata.title,
      description: metadata.description,
      // Same conversion options as the SDK's own tools/list handler.
      inputSchema: toJsonSchemaCompat(inputSchema, { strictUnions: true, pipeStrategy: 'input' }),
      annotations: { title: metadata.title, ...metadata.annotations },
      securitySchemes: resolveSecuritySchemes(metadata, mode),
    }
  })

export const buildServerCard = (
  endpoint: string,
  options: { authKey?: string; authSecret?: string; resourceMetadataUrl?: string } = {},
): ServerCard => {
  const hasCredentials = Boolean(options.authKey && options.authSecret)
  const tools = buildTools(resolveToolAuthMode(options))
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
