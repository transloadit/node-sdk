import { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun =
  process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server create assembly (stdio)', { timeout: 30000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('creates an assembly, uploads a file, and returns results', async () => {
    const pixelPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='

    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          steps: {
            ':original': {
              robot: '/upload/handle',
            },
            resized: {
              robot: '/image/resize',
              use: ':original',
              width: 1,
              height: 1,
              result: true,
            },
          },
        },
        files: [
          {
            kind: 'base64',
            field: 'file',
            filename: 'pixel.png',
            base64: pixelPng,
          },
        ],
        wait_for_completion: true,
      },
    })

    const payload = parseToolPayload(result)

    expect(payload.status).toBe('ok')
    expect(isRecord(payload.assembly)).toBe(true)
    const assembly = payload.assembly as Record<string, unknown>
    expect(assembly.assembly_id).toBeDefined()
    const results = isRecord(assembly.results) ? assembly.results : {}
    const resized = (results as Record<string, unknown>).resized
    expect(Array.isArray(resized)).toBe(true)
    expect((payload.upload as Record<string, unknown> | undefined)?.status).toBe('complete')
    expect(Array.isArray(payload.next_steps)).toBe(true)
  })
})
