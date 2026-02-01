import { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, parseToolPayload } from './mcp-client.ts'

describe('mcp-server stdio', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
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
