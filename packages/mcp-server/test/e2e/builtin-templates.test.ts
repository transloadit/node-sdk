import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server builtin templates', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('lists builtin templates with steps', async () => {
    const result = await client.callTool({
      name: 'transloadit_list_templates',
      arguments: {
        include_builtin: 'exclusively-latest',
        include_content: true,
        page_size: 100,
      },
    })

    const payload = parseToolPayload(result)

    expect(payload.status).toBe('ok')
    expect(Array.isArray(payload.templates)).toBe(true)

    const templates = payload.templates as Array<Record<string, unknown>>
    const builtins = templates.filter((template) =>
      typeof template.name === 'string' ? template.name.startsWith('builtin/') : false,
    )

    const endpoint = process.env.TRANSLOADIT_ENDPOINT ?? ''
    const isLocalEndpoint =
      endpoint.includes('localhost') || endpoint.includes('127.0.0.1') || endpoint.includes('::1')

    const expectsBuiltins =
      isLocalEndpoint || endpoint.includes('devdock') || endpoint.includes('transloadit.dev')

    if (isLocalEndpoint) {
      expect(builtins.length).toBe(2)
    } else if (expectsBuiltins) {
      expect(builtins.length).toBeGreaterThan(0)
    } else {
      expect(builtins.length).toBeGreaterThanOrEqual(0)
    }

    if (builtins.length === 0) {
      return
    }

    const hls = builtins.find((template) =>
      typeof template.name === 'string' ? template.name.includes('encode-hls-video') : false,
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
