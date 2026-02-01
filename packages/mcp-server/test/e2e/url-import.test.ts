import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

const demoImage = 'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg'

maybeDescribe('mcp-server URL import (stdio)', { timeout: 60000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('injects /http/import steps and processes the remote file', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          steps: {
            resize: {
              robot: '/image/resize',
              use: 'remote',
              width: 1,
              height: 1,
              result: true,
            },
          },
        },
        files: [
          {
            kind: 'url',
            field: 'remote',
            url: demoImage,
          },
        ],
        wait_for_completion: true,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    const upload = isRecord(payload.upload) ? payload.upload : {}
    expect(upload.status).toBe('none')

    const assembly = isRecord(payload.assembly) ? payload.assembly : {}
    const results = isRecord(assembly.results) ? assembly.results : {}
    const resized = (results as Record<string, unknown>).resize
    expect(Array.isArray(resized)).toBe(true)
  })
})
