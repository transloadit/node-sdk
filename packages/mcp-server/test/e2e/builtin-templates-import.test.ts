import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, parseToolPayload } from './mcp-client.ts'

describe('mcp-server builtin template imports', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('injects an imported /http/import step for URL inputs', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        builtin_template: { slug: 'builtin/encode-hls-video' },
        files: [
          {
            kind: 'url',
            field: 'video',
            url: 'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg',
          },
        ],
        wait_for_completion: false,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')

    const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
    expect(warnings.length).toBeGreaterThan(0)
    const imported = warnings.find((warning) => warning.code === 'mcp_imported_step')
    expect(imported).toBeTruthy()
  })
})
