import type { TransloaditMcpServerOptions } from '../../src/server.ts'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import { createTransloaditMcpServer } from '../../src/server.ts'
import { parseToolPayload } from '../e2e/mcp-client.ts'

const endpoint = 'https://api2.transloadit.com'

const connect = async (options: TransloaditMcpServerOptions): Promise<Client> => {
  const server = createTransloaditMcpServer({ authKey: 'key', authSecret: 'secret', ...options })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'signature-algorithm', version: '1.0.0' })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

/** Captures the `signature` query parameter API2 receives for `GET /templates`. */
const captureTemplatesSignature = (): { signature: () => string | undefined } => {
  let signature: string | undefined
  nock(endpoint)
    .get('/templates')
    .query((query) => {
      signature = typeof query.signature === 'string' ? query.signature : undefined
      return true
    })
    .reply(200, { items: [], count: 0 })
  return { signature: () => signature }
}

describe('key/secret signature algorithm', () => {
  let client: Client | undefined

  afterEach(async () => {
    await client?.close()
    client = undefined
    nock.cleanAll()
  })

  it.each([
    ['sha1'],
    ['sha256'],
    ['sha384'],
  ] as const)('signs with %s when configured', async (signatureAlgorithm) => {
    const captured = captureTemplatesSignature()
    client = await connect({ signatureAlgorithm })

    const result = await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    expect(result.structuredContent).toMatchObject({ status: 'ok' })
    expect(captured.signature()).toMatch(new RegExp(`^${signatureAlgorithm}:[0-9a-f]+$`))
  })

  it('keeps the SDK default of sha384 when nothing is configured', async () => {
    const captured = captureTemplatesSignature()
    client = await connect({})

    await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    expect(captured.signature()).toMatch(/^sha384:/)
  })

  it('tells the caller which algorithm the Auth Key requires', async () => {
    nock(endpoint).get('/templates').query(true).reply(400, {
      error: 'INVALID_SIGNATURE',
      message: 'The given signature does not match ours. This Auth Key requires sha256.',
    })
    client = await connect({})

    await client.listTools()
    const result = await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    expect(result.isError).toBe(true)
    expect(parseToolPayload(result)).toMatchObject({
      status: 'error',
      errors: [
        {
          code: 'mcp_invalid_signature',
          hint: expect.stringContaining('TRANSLOADIT_SIGNATURE_ALGORITHM=sha256'),
        },
      ],
    })
  })
})
