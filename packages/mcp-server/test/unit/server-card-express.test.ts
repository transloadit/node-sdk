import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
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
