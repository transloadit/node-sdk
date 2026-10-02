import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

type RequestHandler = (request: unknown, extra: unknown) => Promise<unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isRequestHandler = (value: unknown): value is RequestHandler => typeof value === 'function'

/**
 * `@modelcontextprotocol/sdk` keeps request handlers in the private `Protocol._requestHandlers`
 * map and offers no getter. Reading it is the only way to wrap the SDK's own `tools/list` handler
 * rather than re-implementing it; a failing read throws so an SDK upgrade cannot silently drop the
 * field.
 */
const readRequestHandlers = (server: McpServer): Map<unknown, unknown> => {
  const handlers: unknown = Object.getOwnPropertyDescriptor(
    server.server,
    '_requestHandlers',
  )?.value
  if (!(handlers instanceof Map)) {
    throw new Error('@modelcontextprotocol/sdk no longer keeps _requestHandlers in a Map.')
  }
  return handlers
}

const withTopLevelSecuritySchemes = (result: unknown): unknown => {
  if (!isRecord(result) || !Array.isArray(result.tools)) return result
  return {
    ...result,
    tools: result.tools.map((tool) => {
      if (!isRecord(tool) || !isRecord(tool._meta) || !Array.isArray(tool._meta.securitySchemes)) {
        return tool
      }
      return { ...tool, securitySchemes: tool._meta.securitySchemes }
    }),
  }
}

/**
 * ChatGPT and Claude read `securitySchemes` as a top-level Tool field, which `registerTool()`
 * cannot emit. Wrapping the SDK's `tools/list` handler keeps its live registry (tools registered
 * later, enable/disable, schema conversion) and copies each tool's `_meta.securitySchemes` up.
 * Call it after the first `registerTool()`, which installs the handler.
 */
export const mirrorSecuritySchemes = (server: McpServer): void => {
  const handlers = readRequestHandlers(server)
  const listTools = handlers.get('tools/list')
  if (!isRequestHandler(listTools)) {
    throw new Error('Register a tool before mirroring securitySchemes into tools/list.')
  }
  const wrapped: RequestHandler = async (request, extra) =>
    withTopLevelSecuritySchemes(await listTools(request, extra))
  handlers.set('tools/list', wrapped)
}
