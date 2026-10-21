import type { Client } from '@modelcontextprotocol/sdk/client'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

const demoImage = 'https://demos.transloadit.com/66/01604e7d0248109df8c7cc0f8daef8/snowflake.jpg'

maybeDescribe('mcp-server URL inputs (stdio)', { timeout: 60000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('downloads the URL when no import step is present', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          steps: {
            ':original': {
              robot: '/upload/handle',
            },
            resize: {
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
    expect(upload.status).toBe('complete')

    const assembly = isRecord(payload.assembly) ? payload.assembly : {}
    const results = isRecord(assembly.results) ? assembly.results : {}
    const resized = (results as Record<string, unknown>).resize
    expect(Array.isArray(resized)).toBe(true)
  })

  it('uses the existing /http/import step when provided', async () => {
    const result = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        instructions: {
          steps: {
            remote: {
              robot: '/http/import',
            },
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
            field: 'remote_1',
            url: demoImage,
          },
          {
            kind: 'url',
            field: 'remote_2',
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
    expect(resized).toHaveLength(2)
  })

  // Passes with either API2: one with input_url (api2#10292) imports the URL itself, an older one
  // runs the Builtin without input files and the shortcut falls back to downloading the URL.
  it('processes a URL with a Builtin shortcut', async () => {
    const result = await client.callTool({
      name: 'transloadit_prepare_image',
      arguments: {
        fields: { w: 64, h: 64 },
        files: [{ kind: 'url', field: 'remote', url: demoImage }],
        wait_for_completion: true,
      },
    })

    const payload = parseToolPayload(result)
    expect(payload.status).toBe('ok')
    const assembly = isRecord(payload.assembly) ? payload.assembly : {}
    expect(assembly.ok).toBe('ASSEMBLY_COMPLETED')
    expect(assembly.num_input_files).toBe(1)
    expect(Object.values(isRecord(assembly.results) ? assembly.results : {}).flat()).not.toEqual([])
  })
})
