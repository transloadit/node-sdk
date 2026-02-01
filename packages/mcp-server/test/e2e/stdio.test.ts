import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isTextContent = (value: unknown): value is { type: 'text'; text: string } =>
  isRecord(value) && value.type === 'text' && typeof value.text === 'string'

const parseToolPayload = (result: {
  structuredContent?: Record<string, unknown>
  content?: Array<unknown>
}): JsonRecord => {
  if (isRecord(result.structuredContent)) {
    return result.structuredContent
  }

  const content = result.content?.[0]
  if (!isTextContent(content)) {
    throw new Error('Expected tool response content to be text JSON.')
  }

  const parsed = JSON.parse(content.text)
  if (!isRecord(parsed)) {
    throw new Error('Expected tool response to be a JSON object.')
  }

  return parsed
}

const cliPath = resolve(
  fileURLToPath(new URL('../../src/cli.ts', import.meta.url)),
)

describe('mcp-server stdio', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, 'stdio'],
      env: process.env,
    })

    client = new Client(
      {
        name: 'transloadit-mcp-e2e',
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    )

    await client.connect(transport)
  })

  afterAll(async () => {
    await client?.close()
  })

  it('lists tools and validates instructions', async () => {
    const toolsResult = await client.listTools()
    const toolNames = toolsResult.tools.map((tool) => tool.name)

    expect(toolNames).toContain('transloadit_validate_assembly')

    const result = await client.callTool({
      name: 'transloadit_validate_assembly',
      arguments: {
        instructions: {
          steps: {
            ':original': {
              robot: '/upload/handle',
            },
          },
        },
      },
    })

    const payload = parseToolPayload(result)

    expect(payload.status).toBe('ok')
    expect(payload.linting_issues.length).toBeGreaterThan(0)
    expect(payload.linting_issues[0]?.severity).toBe('warning')
  })

  it('lists robots and fetches parameter help', async () => {
    const listResult = await client.callTool({
      name: 'transloadit_list_robots',
      arguments: {
        category: 'content-delivery',
        search: 'serve',
        limit: 10,
      },
    })

    const listPayload = parseToolPayload(listResult)

    expect(listPayload.status).toBe('ok')
    expect(Array.isArray(listPayload.robots)).toBe(true)

    const robots = listPayload.robots as Array<{ name: string }>
    const serveRobot = robots.find((robot) => robot.name === '/file/serve')
    expect(serveRobot).toBeDefined()

    const helpResult = await client.callTool({
      name: 'transloadit_get_robot_help',
      arguments: {
        robot_name: '/file/serve',
        detail_level: 'params',
      },
    })

    const helpPayload = parseToolPayload(helpResult)

    expect(helpPayload.status).toBe('ok')
    expect(helpPayload.robot).toBeDefined()
    expect(Array.isArray(helpPayload.robot?.required_params)).toBe(true)
    expect(Array.isArray(helpPayload.robot?.optional_params)).toBe(true)

    const optional = helpPayload.robot?.optional_params as Array<{ name: string }>
    expect(optional.some((param) => param.name === 'headers')).toBe(true)
  })
})
