import { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

describe('mcp-server golden templates', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('lists golden templates with steps', async () => {
    const result = await client.callTool({
      name: 'transloadit_list_golden_templates',
      arguments: {},
    })

    const payload = parseToolPayload(result)

    expect(payload.status).toBe('ok')
    expect(Array.isArray(payload.templates)).toBe(true)

    const templates = payload.templates as Array<Record<string, unknown>>
    const hls = templates.find(
      (template) => template.slug === '~transloadit/encode-hls-video@0.0.1',
    )

    expect(isRecord(hls)).toBe(true)
    const steps = isRecord(hls?.steps) ? hls?.steps : {}
    const original = isRecord((steps as Record<string, unknown>)[':original'])
      ? (steps as Record<string, unknown>)[':original']
      : undefined

    expect(isRecord(original)).toBe(true)
    expect((original as Record<string, unknown>).robot).toBe('/upload/handle')
  })
})
