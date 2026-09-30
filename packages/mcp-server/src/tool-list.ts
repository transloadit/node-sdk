import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ZodObject } from 'zod'

import type { ToolSecurityScheme } from './tool-metadata.ts'

import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

export type ListedTool = {
  name: string
  inputSchema: ZodObject
  outputSchema: ZodObject
  securitySchemes: ToolSecurityScheme[]
  registered: RegisteredTool
}

type ListedToolDefinition = Tool & { securitySchemes: ToolSecurityScheme[] }

// Same options the SDK passes to Zod for v4 schemas, so the advertised schemas stay identical.
const jsonSchemaTarget = 'draft-7'

const toObjectJsonSchema = (schema: ZodObject, io: 'input' | 'output'): Tool['inputSchema'] => {
  const jsonSchema = z.toJSONSchema(schema, { target: jsonSchemaTarget, io })
  // Zod types the payload loosely (any schema kind, boolean sub-schemas); a ZodObject always
  // serializes to an object schema with object properties, so this only narrows the type.
  if (jsonSchema.type !== 'object') {
    throw new Error(`Expected an object JSON schema, received ${String(jsonSchema.type)}`)
  }
  const properties: Record<string, object> = {}
  for (const [key, value] of Object.entries(jsonSchema.properties ?? {})) {
    if (typeof value === 'object') properties[key] = value
  }
  return { ...jsonSchema, type: 'object', properties }
}

const toToolDefinition = ({
  name,
  inputSchema,
  outputSchema,
  securitySchemes,
  registered,
}: ListedTool): ListedToolDefinition => ({
  name,
  title: registered.title,
  description: registered.description,
  inputSchema: toObjectJsonSchema(inputSchema, 'input'),
  outputSchema: toObjectJsonSchema(outputSchema, 'output'),
  annotations: registered.annotations,
  execution: registered.execution,
  _meta: registered._meta,
  securitySchemes,
})

/**
 * Replaces the SDK's `tools/list` handler so every tool also carries the top-level
 * `securitySchemes` field, which `registerTool()` has no way to emit. The definitions are built
 * the same way the SDK builds them; only the extra field differs.
 */
export const installToolListHandler = (server: McpServer, tools: ListedTool[]): void => {
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.filter((tool) => tool.registered.enabled).map(toToolDefinition),
  }))
}
