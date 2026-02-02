import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server wait for assembly (stdio)', { timeout: 30000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('waits for completion and returns results', async () => {
    const pixelPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='

    const createResult = await client.callTool({
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
      },
    })

    const createPayload = parseToolPayload(createResult)
    expect(createPayload.status).toBe('ok')
    expect(isRecord(createPayload.assembly)).toBe(true)

    const assembly = createPayload.assembly as Record<string, unknown>
    const assemblyUrl =
      (assembly.assembly_ssl_url as string | undefined) ??
      (assembly.assembly_url as string | undefined)

    expect(assemblyUrl).toBeDefined()

    const statusResult = await client.callTool({
      name: 'transloadit_get_assembly_status',
      arguments: {
        assembly_url: assemblyUrl,
      },
    })

    const statusPayload = parseToolPayload(statusResult)
    expect(statusPayload.status).toBe('ok')
    expect(statusPayload.assembly).toBeDefined()

    const waitResult = await client.callTool({
      name: 'transloadit_wait_for_assembly',
      arguments: {
        assembly_url: assemblyUrl,
        timeout_ms: 60000,
      },
    })

    const waitPayload = parseToolPayload(waitResult)
    expect(waitPayload.status).toBe('ok')
    expect(isRecord(waitPayload.assembly)).toBe(true)

    const finalAssembly = waitPayload.assembly as Record<string, unknown>
    const results = isRecord(finalAssembly.results) ? finalAssembly.results : {}
    const resized = (results as Record<string, unknown>).resized
    expect(Array.isArray(resized)).toBe(true)
  })
})
