import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

describe('mcp-server robots (stdio)', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('lists robots and returns example snippets', async () => {
    const listResult = await client.callTool({
      name: 'transloadit_list_robots',
      arguments: {
        category: 'file-importing',
        search: 'import',
        limit: 5,
      },
    })

    const listPayload = parseToolPayload(listResult)
    expect(listPayload.status).toBe('ok')
    const listedRobots = Array.isArray(listPayload.robots) ? listPayload.robots : []
    expect(listedRobots.length).toBeGreaterThan(0)

    const importRobot = (listedRobots as Array<{ name: string }>).find(
      (robot) => robot.name === '/http/import',
    )

    const helpResult = await client.callTool({
      name: 'transloadit_get_robot_help',
      arguments: {
        robot_names: [importRobot?.name ?? '/http/import'],
      },
    })

    const helpPayload = parseToolPayload(helpResult)
    expect(helpPayload.status).toBe('ok')

    const helpRobots = Array.isArray(helpPayload.robots) ? helpPayload.robots : []
    expect(helpRobots.length).toBeGreaterThan(0)

    const robot = (helpRobots as Array<Record<string, unknown>>).find(
      (item) => isRecord(item) && item.name === '/http/import',
    )
    expect(robot).toBeDefined()
    expect(typeof robot?.summary).toBe('string')
    expect(Array.isArray(robot?.examples)).toBe(true)

    const example = ((robot?.examples as Array<{ snippet?: unknown }> | undefined) ?? [])[0]
    expect(isRecord(example?.snippet)).toBe(true)
  })
})
