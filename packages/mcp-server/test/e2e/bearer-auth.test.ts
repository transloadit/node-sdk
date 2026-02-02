import type { Client } from '@modelcontextprotocol/sdk/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHttpClient, startHttpServer } from './http-server.ts'
import { parseToolPayload } from './mcp-client.ts'

const shouldRun = process.env.TRANSLOADIT_KEY != null && process.env.TRANSLOADIT_SECRET != null
const maybeDescribe = shouldRun ? describe : describe.skip

const fetchBearerToken = async (): Promise<string> => {
  const authKey = process.env.TRANSLOADIT_KEY as string
  const authSecret = process.env.TRANSLOADIT_SECRET as string
  const basic = Buffer.from(`${authKey}:${authSecret}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'assemblies:write assemblies:read',
    aud: 'mcp',
  })

  const response = await fetch('https://api2.transloadit.com/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to mint bearer token: ${response.status} ${text}`)
  }

  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) {
    throw new Error('Bearer token response missing access_token.')
  }

  return payload.access_token
}

maybeDescribe('mcp-server bearer auth (http)', { timeout: 60000 }, () => {
  let client: Client
  let closeServer: (() => Promise<void>) | undefined

  beforeAll(async () => {
    const authKey = process.env.TRANSLOADIT_KEY as string
    const authSecret = process.env.TRANSLOADIT_SECRET as string
    const { url, close } = await startHttpServer({ authKey, authSecret })
    closeServer = close
    const token = await fetchBearerToken()
    const clientInfo = await createHttpClient(url, {
      Authorization: `Bearer ${token}`,
    })
    client = clientInfo.client
  })

  afterAll(async () => {
    await client?.close()
    await closeServer?.()
  })

  it('creates an assembly using a bearer token', async () => {
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
  })
})
