import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from '../e2e/mcp-client.ts'

describe('mcp-server robots (unit)', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('returns full docs for multiple robots', async () => {
    const helpResult = await client.callTool({
      name: 'transloadit_get_robot_help',
      arguments: {
        robot_names: ['/http/import', '/image/resize'],
      },
    })

    const helpPayload = parseToolPayload(helpResult)
    expect(helpPayload.status).toBe('ok')
    expect(Array.isArray(helpPayload.robots)).toBe(true)

    const robots = helpPayload.robots as unknown[]
    const httpImport = robots.find((robot) => isRecord(robot) && robot.name === '/http/import') as
      | Record<string, unknown>
      | undefined

    expect(httpImport).toBeDefined()
    expect(typeof httpImport?.summary).toBe('string')
    expect(Array.isArray(httpImport?.required_params)).toBe(true)
    expect(Array.isArray(httpImport?.optional_params)).toBe(true)
    expect(Array.isArray(httpImport?.examples)).toBe(true)
    expect((httpImport?.examples as unknown[] | undefined)?.length).toBeGreaterThan(0)
  })
})
