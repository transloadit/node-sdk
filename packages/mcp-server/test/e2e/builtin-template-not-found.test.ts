import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server builtin template not found DX', { timeout: 20000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('returns an actionable hint when a builtin template id is missing', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          template_id: 'builtin/does-not-exist@0.0.1',
        },
      },
    })

    const payload = parseToolPayload(result)

    expect(payload.status).toBe('error')
    const errors = Array.isArray(payload.errors) ? payload.errors : []
    const notFound = errors.find((error) => error.code === 'mcp_template_not_found')
    expect(notFound).toBeDefined()
    expect(String(notFound?.hint ?? '')).toContain('include_builtin')
    expect(String(notFound?.hint ?? '')).toContain('exclusively-latest')
  })
})
