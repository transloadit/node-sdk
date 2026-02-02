import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server base64 limit (stdio)', { timeout: 30000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('fails fast with a helpful error when base64 exceeds the limit', async () => {
    const tooLarge = Buffer.alloc(600_000).toString('base64')

    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          steps: {
            ':original': {
              robot: '/upload/handle',
            },
          },
        },
        files: [
          {
            kind: 'base64',
            field: 'file',
            filename: 'too-large.bin',
            base64: tooLarge,
          },
        ],
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('error')
    expect(Array.isArray(payload.errors)).toBe(true)
    const error = payload.errors?.[0] as { code?: string; hint?: string; message?: string }
    expect(error?.code).toBe('mcp_base64_too_large')
    expect(error?.hint).toContain('Use a URL import or path upload instead')
    expect(error?.message).toContain('Base64 payload exceeds')
  })
})
