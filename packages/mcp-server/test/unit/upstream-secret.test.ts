import type { AddressInfo } from 'node:net'

import type { TransloaditMcpHttpOptions } from '../../src/http.ts'

import { createServer } from 'node:http'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import nock from 'nock'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTransloaditMcpHttpHandler } from '../../src/http.ts'
import { redactForLog } from '../../src/logger.ts'
import { upstreamSecretHeader } from '../../src/server.ts'

const upstreamSecret = 'upstream-s3cr3t'
const endpoint = 'https://api2.transloadit.com'

describe('upstream secret header', () => {
  const serverOptions: TransloaditMcpHttpOptions = { metricsPath: false }
  const handler = createTransloaditMcpHttpHandler(serverOptions)
  const httpServer = createServer((req, res) => {
    void handler(req, res)
  })
  let url: URL
  let client: Client

  const connect = async (headers: Record<string, string> = {}): Promise<void> => {
    client = new Client({ name: 'upstream-secret', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }))
  }

  const listTemplates = async (): Promise<unknown> => {
    const result = await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    return result.structuredContent
  }

  beforeEach(async () => {
    delete serverOptions.authKey
    delete serverOptions.authSecret
    delete serverOptions.upstreamSecret
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
    const { port } = httpServer.address() as AddressInfo
    url = new URL(`http://127.0.0.1:${port}/mcp`)
  })

  afterEach(async () => {
    await client?.close()
    await handler.close()
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    )
    nock.cleanAll()
  })

  it('sends the header with a forwarded bearer token in hosted mode', async () => {
    serverOptions.upstreamSecret = upstreamSecret
    const api = nock(endpoint, {
      reqheaders: {
        authorization: 'Bearer forwarded-oauth-token',
        [upstreamSecretHeader.toLowerCase()]: upstreamSecret,
      },
    })
      .get('/templates')
      .query(true)
      .reply(200, { items: [], count: 0 })
    await connect({ Authorization: 'Bearer forwarded-oauth-token' })

    await expect(listTemplates()).resolves.toMatchObject({ status: 'ok', templates: [] })
    expect(api.isDone()).toBe(true)
  })

  it('omits the header when no secret is configured', async () => {
    const api = nock(endpoint, { badheaders: [upstreamSecretHeader.toLowerCase()] })
      .get('/templates')
      .query(true)
      .reply(200, { items: [], count: 0 })
    await connect({ Authorization: 'Bearer forwarded-oauth-token' })

    await expect(listTemplates()).resolves.toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
  })

  it('omits the header for self-hosted key/secret calls even when configured', async () => {
    serverOptions.upstreamSecret = upstreamSecret
    serverOptions.authKey = 'key'
    serverOptions.authSecret = 'secret'
    const api = nock(endpoint, { badheaders: [upstreamSecretHeader.toLowerCase()] })
      .get('/templates')
      .query(true)
      .reply(200, { items: [], count: 0 })
    await connect()

    await expect(listTemplates()).resolves.toMatchObject({ status: 'ok' })
    expect(api.isDone()).toBe(true)
  })

  it('keeps the secret out of tool errors and the server card', async () => {
    serverOptions.upstreamSecret = upstreamSecret
    nock(endpoint).get('/templates').query(true).reply(500, { error: 'SERVER_ERROR' })
    await connect({ Authorization: 'Bearer forwarded-oauth-token' })

    const result = await client.callTool({ name: 'transloadit_list_templates', arguments: {} })
    expect(JSON.stringify(result)).not.toContain(upstreamSecret)

    const card = await fetch(new URL('/.well-known/mcp/server-card.json', url))
    expect(await card.text()).not.toContain(upstreamSecret)
  })
})

describe('redactForLog', () => {
  it('scrubs the upstream secret header even when the value was not listed', () => {
    const line = `request failed headers={"Transloadit-Mcp-Upstream":"${upstreamSecret}","Authorization":"Bearer abc"}`
    const redacted = redactForLog(line, [])
    expect(redacted).not.toContain(upstreamSecret)
    expect(redacted).toContain('Transloadit-Mcp-Upstream')
    expect(redacted).toContain('Bearer [redacted]')
  })

  it('scrubs listed secrets anywhere in the message', () => {
    expect(redactForLog(`boom ${upstreamSecret} boom`, [upstreamSecret])).toBe(
      'boom [redacted] boom',
    )
  })
})
