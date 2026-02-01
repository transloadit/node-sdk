import { expect, test } from 'vitest'
import { createHttpClient, startHttpServer } from './http-server.ts'
import { parseToolPayload } from './mcp-client.ts'

test('streamable http: lists robots and provides param help', async () => {
  const server = await startHttpServer()

  try {
    const { client, transport } = await createHttpClient(server.url)

    try {
      const robots = await client.callTool({
        name: 'transloadit_list_robots',
        arguments: { search: 'image' },
      })

      const robotsPayload = parseToolPayload(robots)
      expect(robotsPayload.status).toBe('ok')
      expect(Array.isArray(robotsPayload.robots)).toBe(true)
      expect(robotsPayload.robots.length).toBeGreaterThan(0)

      const firstRobot = robotsPayload.robots[0] as { name: string }
      const help = await client.callTool({
        name: 'transloadit_get_robot_help',
        arguments: { robot_name: firstRobot.name, detail_level: 'params' },
      })

      const helpPayload = parseToolPayload(help)
      expect(helpPayload.status).toBe('ok')
      expect(helpPayload.robot?.name).toBe(firstRobot.name)
      expect(Array.isArray(helpPayload.robot?.optional_params)).toBe(true)
    } finally {
      await transport.close()
      await client.close()
    }
  } finally {
    await server.close()
  }
})
