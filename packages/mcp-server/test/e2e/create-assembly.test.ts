import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))
const shouldRun =
  process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isTextContent = (value: unknown): value is { type: 'text'; text: string } =>
  isRecord(value) && value.type === 'text' && typeof value.text === 'string'

const parseToolPayload = (result: {
  structuredContent?: Record<string, unknown>
  content?: Array<unknown>
}): Record<string, unknown> => {
  if (isRecord(result.structuredContent)) {
    return result.structuredContent
  }

  const content = result.content?.[0]
  if (!isTextContent(content)) {
    throw new Error('Expected tool response content to be text JSON.')
  }

  const parsed = JSON.parse(content.text)
  if (!isRecord(parsed)) {
    throw new Error('Expected tool response to be a JSON object.')
  }

  return parsed
}

maybeDescribe('mcp-server create assembly (stdio)', { timeout: 30000 }, () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, 'stdio'],
      env: process.env,
    })

    client = new Client(
      {
        name: 'transloadit-mcp-e2e',
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    )

    await client.connect(transport)
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
