import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createMcpClient, isRecord, parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

maybeDescribe('mcp-server resume assembly (stdio)', { timeout: 60000 }, () => {
  let client: Client

  beforeAll(async () => {
    client = await createMcpClient()
  })

  afterAll(async () => {
    await client?.close()
  })

  it('returns upload URLs and lets us resume with the same input', async () => {
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
        upload_behavior: 'none',
      },
    })

    const createPayload = parseToolPayload(createResult)
    expect(createPayload.status).toBe('ok')

    const createUpload = isRecord(createPayload.upload) ? createPayload.upload : {}
    expect(createUpload.status).toBe('none')
    expect(createUpload.total_files).toBe(1)

    const uploadUrls = isRecord(createUpload.upload_urls) ? createUpload.upload_urls : {}
    expect(typeof uploadUrls.file).toBe('string')

    const createAssembly = isRecord(createPayload.assembly) ? createPayload.assembly : {}
    const assemblyUrl =
      (createAssembly.assembly_ssl_url as string | undefined) ??
      (createAssembly.assembly_url as string | undefined)

    expect(assemblyUrl).toBeDefined()

    const resumeResult = await client.callTool({
      name: 'transloadit_create_assembly',
      arguments: {
        assembly_url: assemblyUrl,
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

    const resumePayload = parseToolPayload(resumeResult)
    expect(resumePayload.status).toBe('ok')

    const resumeUpload = isRecord(resumePayload.upload) ? resumePayload.upload : {}
    expect(resumeUpload.resumed).toBe(true)
    expect(resumeUpload.status).toBe('complete')

    const finalAssembly = isRecord(resumePayload.assembly) ? resumePayload.assembly : {}
    const results = isRecord(finalAssembly.results) ? finalAssembly.results : {}
    const resized = (results as Record<string, unknown>).resized
    expect(Array.isArray(resized)).toBe(true)
  })
})
