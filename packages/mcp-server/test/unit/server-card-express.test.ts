import type { AddressInfo } from 'node:net'

import { createServer } from 'node:http'

import express from 'express'
import nock from 'nock'
import { afterEach, describe, expect, it } from 'vitest'

import { createTransloaditMcpExpressRouter } from '../../src/express.ts'

type RunningServer = { close: () => Promise<void>; baseUrl: URL }

const start = async (): Promise<RunningServer> => {
  const app = express()
  app.use(
    await createTransloaditMcpExpressRouter({
      authKey: 'key',
      authSecret: 'secret',
      path: '/mcp',
    }),
  )

  const server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const baseUrl = new URL(`http://127.0.0.1:${port}`)

  return {
    baseUrl,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      })
    },
  }
}

describe('server card (express router)', () => {
  let running: RunningServer | undefined

  afterEach(async () => {
    if (running) {
      await running.close()
      running = undefined
    }
  })

  it('serves the server card with GET/HEAD/OPTIONS', async () => {
    running = await start()

    const cardUrl = new URL('/.well-known/mcp/server-card.json', running.baseUrl)

    const optionsRes = await fetch(cardUrl, { method: 'OPTIONS' })
    expect(optionsRes.status).toBe(204)

    const headRes = await fetch(cardUrl, { method: 'HEAD' })
    expect(headRes.status).toBe(200)
    expect(await headRes.text()).toBe('')

    const getRes = await fetch(cardUrl)
    expect(getRes.status).toBe(200)
    expect(getRes.headers.get('content-type')).toContain('application/json')
    expect(getRes.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('hosted Express router', () => {
  let running: RunningServer | undefined

  afterEach(async () => {
    if (running) {
      await running.close()
      running = undefined
    }
  })

  const startHostedRouter = async (
    extra: Parameters<typeof createTransloaditMcpExpressRouter>[0] = {},
  ): Promise<RunningServer> => {
    const app = express()
    app.use(
      createTransloaditMcpExpressRouter({
        path: '/mcp',
        resourceMetadataUrl:
          'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp',
        ...extra,
      }),
    )
    const server = createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    return {
      baseUrl: new URL(`http://127.0.0.1:${port}`),
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()))
        }),
    }
  }

  const postMcp = (body: string): Promise<Response> =>
    fetch(new URL('/mcp', running?.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expired-oauth-token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body,
    })

  it('keeps an unparsed batch at 200 so the client does not replay it', async () => {
    running = await startHostedRouter()
    nock('https://api2.transloadit.com')
      .get('/templates')
      .query(true)
      .reply(401, { error: 'BEARER_TOKEN_EXPIRED' })

    const response = await postMcp(
      JSON.stringify([
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'transloadit_list_robots', arguments: { limit: 1 } },
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'transloadit_list_templates', arguments: {} },
        },
      ]),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('mcp_auth_rejected')
    nock.cleanAll()
  })

  it('refuses unparsed bodies above the configured limit', async () => {
    running = await startHostedRouter({ maxRequestBodyBytes: 1024 })

    const response = await postMcp(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { pad: 'x'.repeat(4096) },
      }),
    )
    expect(response.status).toBe(413)
  })

  it('refuses unparsed self-hosted bodies above the configured limit', async () => {
    running = await startHostedRouter({ resourceMetadataUrl: undefined, maxRequestBodyBytes: 1024 })

    const response = await postMcp(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: { pad: 'x'.repeat(4096) },
      }),
    )
    expect(response.status).toBe(413)
  })

  it('serves unparsed self-hosted bodies within the limit', async () => {
    running = await startHostedRouter({ resourceMetadataUrl: undefined })

    const response = await postMcp(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('transloadit_list_robots')
  })

  it('reads the request body itself when no JSON body parser is installed', async () => {
    const app = express()
    app.use(
      createTransloaditMcpExpressRouter({
        path: '/mcp',
        resourceMetadataUrl:
          'https://api2.transloadit.com/.well-known/oauth-protected-resource/mcp',
      }),
    )
    const server = createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    running = {
      baseUrl: new URL(`http://127.0.0.1:${port}`),
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()))
        }),
    }

    const response = await fetch(new URL('/mcp', running.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('transloadit_list_robots')
  })
})
